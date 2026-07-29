/**
 * What an order actually IS — set at write time, never inferred at read time.
 *
 * The orders table is shared by every product that takes money: store merchandise,
 * TOC registrations, Blue memberships, drop-ins, national team fees, guild, fundraising.
 * Before this column existed, all of them looked like unfulfilled merchandise orders,
 * so the fulfillment queue and the store revenue numbers were both wrong.
 *
 * `channel`/`business` describe where the money came from. `order_type` describes what
 * was bought, which is what decides whether an order needs picking, packing, and shipping.
 */

export const ORDER_TYPES = [
  "merchandise",
  "toc_registration",
  "toc_ticket",
  "blue_subscription",
  "drop_in",
  "national_team_fee",
  "guild",
  "donation",
  "unknown",
] as const

export type OrderType = (typeof ORDER_TYPES)[number]

export function isOrderType(value: unknown): value is OrderType {
  return typeof value === "string" && (ORDER_TYPES as readonly string[]).includes(value)
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  merchandise: "Merchandise",
  toc_registration: "TOC registration",
  toc_ticket: "TOC ticket",
  blue_subscription: "Blue membership",
  drop_in: "Practice drop-in",
  national_team_fee: "National team fee",
  guild: "Wrestling Guild",
  donation: "Donation",
  unknown: "Unclassified",
}

/**
 * Does this order need to be picked, packed, and shipped or handed over?
 * Only these belong in the fulfillment queue — everything else is done the moment it's paid.
 */
export const ORDER_TYPE_NEEDS_FULFILLMENT: Record<OrderType, boolean> = {
  merchandise: true,
  toc_registration: false,
  toc_ticket: false,
  blue_subscription: false,
  drop_in: false,
  national_team_fee: true, // travel packages sometimes include apparel
  guild: false,
  donation: false,
  unknown: true, // surface it rather than hide it
}

/** Does a real shipping address matter? Drives the "missing address" warnings. */
export function orderTypeRequiresAddress(type: OrderType): boolean {
  return ORDER_TYPE_NEEDS_FULFILLMENT[type]
}

export type RevenueBucket = "store" | "event" | "programs" | "fundraising" | "unclassified"

export const ORDER_TYPE_REVENUE_BUCKET: Record<OrderType, RevenueBucket> = {
  merchandise: "store",
  toc_registration: "event",
  toc_ticket: "event",
  blue_subscription: "programs",
  drop_in: "programs",
  national_team_fee: "programs",
  guild: "fundraising",
  donation: "fundraising",
  unknown: "unclassified",
}

export const REVENUE_BUCKET_LABELS: Record<RevenueBucket, string> = {
  store: "Store",
  event: "Events",
  programs: "Programs",
  fundraising: "Fundraising",
  unclassified: "Unclassified",
}

/**
 * Best-effort classification for rows written before order_type existed.
 *
 * Used by the backfill and as a read-time fallback for any row still sitting at
 * "unknown". New code must NOT rely on this — set order_type explicitly on insert.
 */
export function classifyLegacyOrder(row: {
  channel?: string | null
  business?: string | null
  shipping_method?: unknown
  order_items?: Array<{ product_name?: string | null; sku?: string | null }> | null
  notes?: string | null
  total?: number | string | null
}): OrderType {
  const methodName = shippingMethodName(row.shipping_method).toLowerCase()
  const channel = (row.channel ?? "").toLowerCase()

  // Explicit admin override wins — it was a human decision.
  const manual = manualCategory(row.shipping_method)
  if (manual) {
    const mapped = MANUAL_CATEGORY_TO_TYPE[manual.toLowerCase()]
    if (mapped) return mapped
  }

  if (methodName.includes("toc") || methodName.includes("tournament of champions")) {
    return methodName.includes("ticket") ? "toc_ticket" : "toc_registration"
  }
  if (methodName.includes("drop-in") || methodName.includes("drop in")) return "drop_in"
  if (methodName.includes("blue membership") || methodName.includes("blue sub")) return "blue_subscription"
  if (methodName.includes("national team")) return "national_team_fee"
  if (methodName.includes("guild")) return "guild"
  if (methodName.includes("donation") || methodName.includes("fundraising")) return "donation"

  if (channel === "blue") return "blue_subscription"
  if (channel === "guild") return "guild"
  if (channel === "spartan") return "donation"
  if (channel === "national_team") return "national_team_fee"
  if (channel === "store") return "merchandise"

  // Line items naming a real product is the strongest merchandise signal we have.
  const items = row.order_items ?? []
  if (items.some((i) => looksLikeMerchandiseName(i?.product_name))) return "merchandise"

  return "unknown"
}

const MANUAL_CATEGORY_TO_TYPE: Record<string, OrderType> = {
  apparel: "merchandise",
  "drop-in": "drop_in",
  "blue sub": "blue_subscription",
  "tournament fee": "toc_registration",
  donation: "donation",
  guild: "guild",
}

/**
 * `orders.shipping_method` is a TEXT column. Most rows hold a serialized JSON object
 * ('{"name":"Blue membership","price":0}'), the rest hold a bare label
 * ('Practice Drop-in', 'Ship anywhere'). Normalize both to an object we can read.
 */
function shippingMethodObject(shippingMethod: unknown): Record<string, unknown> | null {
  if (!shippingMethod) return null
  if (typeof shippingMethod === "object") return shippingMethod as Record<string, unknown>
  if (typeof shippingMethod !== "string") return null

  const trimmed = shippingMethod.trim()
  if (!trimmed.startsWith("{")) return null
  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function shippingMethodName(shippingMethod: unknown): string {
  if (!shippingMethod) return ""

  const parsed = shippingMethodObject(shippingMethod)
  if (parsed) {
    const name = parsed.name
    return typeof name === "string" ? name : ""
  }

  // Bare label form — the whole string is the method name.
  return typeof shippingMethod === "string" ? shippingMethod : ""
}

function manualCategory(shippingMethod: unknown): string | null {
  const parsed = shippingMethodObject(shippingMethod)
  if (!parsed) return null
  const value = parsed.admin_category
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Placeholder names the recovery paths wrote when they couldn't read Stripe line items. */
const PLACEHOLDER_ITEM_NAMES = new Set([
  "product",
  "order items - see stripe metadata",
  "nc united store purchase",
  "recovered",
  "",
])

function looksLikeMerchandiseName(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase()
  if (!n || PLACEHOLDER_ITEM_NAMES.has(n)) return false
  if (n.includes("drop-in") || n.includes("membership") || n.includes("donation")) return false
  return true
}
