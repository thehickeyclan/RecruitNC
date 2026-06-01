import type Stripe from "stripe"

/** True when email/name was synthesized because Stripe had no billing details. */
export function isPlaceholderOrderCustomer(email: string | null | undefined, name: string | null | undefined): boolean {
  if (!email || !String(email).trim()) return true
  const e = String(email).trim().toLowerCase()
  if (e === "unknown@example.com" || e === "no email" || e.includes("placeholder")) return true
  if (!name || !String(name).trim()) return false
  const n = String(name).trim().toLowerCase()
  if (n === "unknown" || n === "guest") return true
  if (n === "customer" || n === "customer customer") return true
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length > 0 && parts.every((p) => p === "customer")) return true
  return false
}

/** Normalize legacy store (camelCase on Charge) + current store (snake_case on PI). */
export function normalizeStripeStoreMetadata(raw: Record<string, string | undefined>): Record<string, string> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k]
      if (v != null && String(v).trim() !== "") return String(v)
    }
    return ""
  }
  return {
    order_id: pick("order_id", "orderId"),
    customer_email: pick("customer_email", "customerEmail"),
    customer_name: pick("customer_name", "customerName"),
    items: pick("items"),
    shipping_address: pick("shipping_address", "shippingAddress"),
    shipping_method: pick("shipping_method", "shippingMethod"),
    shipping: pick("shipping", "shippingCost"),
    subtotal: pick("subtotal"),
    tax: pick("tax"),
    discount: pick("discount"),
    total: pick("total"),
    promo_code: pick("promo_code", "promoCode"),
    source: pick("source"),
    item_count: pick("itemCount", "item_count"),
  }
}

export function mergeStripeStoreMetadata(
  piMeta: Record<string, string | undefined>,
  chargeMeta: Record<string, string | undefined>,
): Record<string, string> {
  const pi = normalizeStripeStoreMetadata(piMeta)
  const ch = normalizeStripeStoreMetadata(chargeMeta)
  const merged = { ...pi }

  for (const [key, value] of Object.entries(ch)) {
    if (!value) continue
    const current = merged[key as keyof typeof merged]
    if (!current) {
      merged[key as keyof typeof merged] = value
      continue
    }
    if (key === "items") {
      const pickRicherItems = (a: string, b: string) => {
        if (!a?.trim()) return b
        if (!b?.trim()) return a
        try {
          const la = JSON.parse(a) as unknown[]
          const lb = JSON.parse(b) as unknown[]
          if (lb.length > la.length) return b
          if (la.length > lb.length) return a
        } catch {
          // fall through to length compare
        }
        return b.length > a.length ? b : a
      }
      merged.items = pickRicherItems(current, value)
      continue
    }
    if (key === "item_count") {
      const a = parseInt(current, 10) || 0
      const b = parseInt(value, 10) || 0
      if (b > a) merged.item_count = value
      continue
    }
    if (key === "customer_email" && isPlaceholderOrderCustomer(current, pi.customer_name)) {
      merged.customer_email = value
    }
    if (key === "customer_name" && isPlaceholderOrderCustomer(pi.customer_email, current)) {
      merged.customer_name = value
    }
    if (key === "shipping_address" && (!current || current === "{}")) {
      merged.shipping_address = value
    }
    if (key === "shipping_method" && (!current || current === "{}")) {
      merged.shipping_method = value
    }
  }

  return merged
}

/** Parse shipping JSON from legacy store (`fn`/`ln`/`a1`) or current store (`firstName`/`address1`). */
export function parseLegacyShippingAddressJson(jsonStr: string): Record<string, unknown> {
  if (!jsonStr?.trim()) return {}
  try {
    const raw = JSON.parse(jsonStr) as Record<string, string>
    if (!raw || typeof raw !== "object") return {}
    if (raw.firstName || raw.address1) return raw
    if (raw.fn || raw.a1) {
      return {
        firstName: raw.fn ?? "",
        lastName: raw.ln ?? "",
        address1: raw.a1 ?? raw.address1 ?? "",
        address2: raw.a2 ?? raw.address2 ?? "",
        city: raw.c ?? raw.city ?? "",
        state: raw.s ?? raw.state ?? "",
        zipCode: raw.z ?? raw.zipCode ?? raw.zip ?? "",
        country: raw.country ?? "US",
        phone: raw.p ?? raw.phone ?? "",
        email: raw.email ?? "",
      }
    }
    return raw
  } catch {
    return {}
  }
}

export function parseLegacyStoreItems(meta: Record<string, string>): Array<{
  id: number | string
  name: string
  price: number
  quantity: number
  variant: { color: string; size: string }
  image?: string
}> {
  try {
    const raw = JSON.parse(meta.items || "[]") as Record<string, unknown>[]
    return raw.map((item) => {
      const v = item.variant as { color: string; size: string } | undefined
      const vStr = typeof item.v === "string" ? item.v : ""
      const variant =
        v ??
        (vStr
          ? { color: vStr.split("/")[0]?.trim() || "N/A", size: vStr.split("/")[1]?.trim() || "N/A" }
          : { color: "N/A", size: "N/A" })
      return {
        id: (item.i as number | string) ?? (item.id as number | string) ?? 0,
        name: (item.n as string) || (item.name as string) || "Product",
        quantity: Number(item.q ?? item.quantity ?? 1),
        price: Number(item.p ?? item.price ?? 0),
        variant,
        image: item.image as string | undefined,
      }
    })
  } catch {
    return []
  }
}

export function parseLegacyShippingMethodJson(jsonStr: string): { name: string; price: number } {
  if (!jsonStr?.trim()) return { name: "Standard Shipping", price: 0 }
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    if (parsed && typeof parsed === "object") {
      return {
        name: (parsed.name as string) || (parsed.n as string) || "Standard Shipping",
        price: Number(parsed.price ?? parsed.p ?? 0),
      }
    }
  } catch {
    // ignore
  }
  return { name: "Standard Shipping", price: 0 }
}

export async function fetchMergedStoreMetadata(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<{ meta: Record<string, string>; paymentIntent: Stripe.PaymentIntent }> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  let chargeMeta: Record<string, string | undefined> = {}
  if (paymentIntent.latest_charge) {
    try {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
      chargeMeta = (charge.metadata || {}) as Record<string, string>
    } catch {
      // ignore
    }
  }
  const meta = mergeStripeStoreMetadata(
    (paymentIntent.metadata || {}) as Record<string, string>,
    chargeMeta,
  )
  return { meta, paymentIntent }
}

export function formatShippingMethodLabel(shippingMethod: unknown): string {
  if (!shippingMethod) return "Standard Shipping"
  if (typeof shippingMethod === "string") {
    try {
      const parsed = JSON.parse(shippingMethod) as { name?: string; n?: string }
      if (parsed && typeof parsed === "object") return parsed.name || parsed.n || shippingMethod
    } catch {
      return shippingMethod
    }
    return shippingMethod
  }
  if (typeof shippingMethod === "object") {
    const o = shippingMethod as { name?: string; n?: string; description?: string }
    return o.name || o.n || o.description || "Standard Shipping"
  }
  return "Standard Shipping"
}
