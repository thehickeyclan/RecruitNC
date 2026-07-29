import { createAdminClient } from "@/lib/supabase/admin"
import { AdminOrdersClient } from "@/components/admin/admin-orders-client"
import type { Order, OrderCategory } from "@/lib/admin-data"
import { resolveOrderCategory } from "@/lib/admin/resolve-order-display"
import { orderDisplayDateFromRow } from "@/lib/orders/ensure-order-from-stripe-invoice"
import { classifyLegacyOrder, isOrderType, orderTypeRequiresAddress, type OrderType } from "@/lib/orders/order-type"

export const dynamic = "force-dynamic"

/** Supabase returns max 1000 rows per request; fetch in chunks so we get all orders. */
const CHUNK_SIZE = 1000
const MAX_ORDERS = 15_000

function isPlaceholderCustomer(email: string | null, name: string | null): boolean {
  if (!email || !String(email).trim()) return true
  const e = String(email).trim().toLowerCase()
  if (e === "unknown@example.com" || e === "no email" || e.includes("placeholder")) return true
  if (!name || !String(name).trim()) return false
  const n = String(name).trim().toLowerCase()
  if (n === "unknown" || n === "customer" || n === "guest") return true
  return false
}

/**
 * What this order is. Prefer the stored column — it was set by whichever code path took
 * the money. Only fall back to guessing for rows written before order_type existed, or
 * for rows the backfill could not classify.
 */
function resolveOrderType(order: {
  order_type?: unknown
  channel?: string | null
  shipping_method?: unknown
  order_items?: { product_name?: string }[] | null
  total?: number | string | null
}): OrderType {
  const stored = order.order_type
  if (isOrderType(stored) && stored !== "unknown") return stored
  return classifyLegacyOrder(order)
}

/** Build one-line product name/summary. Every order gets a product name (never "—" when category is known). */
function productSummary(
  orderItems: { product_name?: string }[],
  category: OrderCategory,
  shippingMethodStr?: string
): string {
  const names = (orderItems || []).map((i) => (i.product_name || "").trim()).filter(Boolean)
  if (category === "Donation") return "Fundraising donation"
  if (category === "Guild") {
    if (names.length === 1) return names[0]
    return names[0] || "Wrestling Guild booking"
  }
  if (category === "Drop-In") {
    if (names.length === 1) return names[0]
    if (names.some((n) => /practice|drop-in|dropin/i.test(n))) return names.find((n) => /practice|drop-in|dropin/i.test(n)) || names[0] || "Practice Drop-In"
    return "Practice Drop-In"
  }
  if (category === "Blue Sub") {
    if (names.some((n) => /blue/i.test(n))) return names.find((n) => /blue/i.test(n)) || names[0] || "NC United Blue – Monthly"
    return "NC United Blue – Monthly"
  }
  if (category === "Tournament Fee") {
    if (names.length > 0) return names.find((n) => /nhsca|national|registration/i.test(n)) || names[0]
    return "Tournament / Event"
  }
  if (category === "Apparel" && names.length > 0) {
    if (names.length <= 2) return names.join(", ")
    return `${names[0]} +${names.length - 1} more`
  }
  if (category === "Other" && names.length > 0) {
    if (names.length <= 2) return names.join(", ")
    return `${names[0]} +${names.length - 1} more`
  }
  const method = (shippingMethodStr || "").toLowerCase()
  if (method.includes("blue")) return "NC United Blue – Monthly"
  if (method.includes("practice") || method.includes("pickup")) return "Practice Drop-In"
  if (method.includes("national team")) return "Tournament / Event"
  return category === "Other" ? "Order" : category
}

export default async function OrdersPage() {
  try {
    const supabase = createAdminClient()
    const allOrders: any[] = []
    let offset = 0
    let hasMore = true

    while (hasMore && allOrders.length < MAX_ORDERS) {
      const { data: chunk, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          *,
          order_items (id, product_name)
        `
        )
        .order("created_at", { ascending: false })
        .range(offset, offset + CHUNK_SIZE - 1)

      if (ordersError) {
        console.error("[admin/orders] Error fetching orders:", ordersError)
        break
      }
      const rows = chunk ?? []
      allOrders.push(...rows)
      hasMore = rows.length === CHUNK_SIZE
      offset += CHUNK_SIZE
    }

    // Deduplicate: one order per id; then one order per Stripe payment (same pi/session = one row; keep earliest)
    const byId = new Map<string, any>()
    for (const o of allOrders) {
      const id = o?.id
      if (!id) continue
      const existing = byId.get(id)
      if (!existing || new Date(o.created_at) < new Date(existing.created_at)) byId.set(id, o)
    }
    const byStripeKey = new Map<string, any>()
    for (const o of byId.values()) {
      const pi = o?.stripe_payment_intent_id
      const sid = o?.stripe_session_id
      const key = pi ? `pi:${pi}` : sid ? `session:${sid}` : `id:${o.id}`
      const existing = byStripeKey.get(key)
      if (!existing || new Date(o.created_at) < new Date(existing.created_at)) byStripeKey.set(key, o)
    }
    const uniqueOrders = Array.from(byStripeKey.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Enrich Guest/No email from national_team_event_registrations and blue_signups
    const orderIdsNeedingEnrich = uniqueOrders
      .filter((o: any) => isPlaceholderCustomer(o.customer_email ?? null, o.customer_name ?? null))
      .map((o: any) => o.id)
    const sessionIdsNeedingEnrich = uniqueOrders
      .filter((o: any) => isPlaceholderCustomer(o.customer_email ?? null, o.customer_name ?? null) && o.stripe_session_id)
      .map((o: any) => o.stripe_session_id)

    const byOrderId: Record<string, { email: string; name: string; event_slug?: string }> = {}
    const bySessionId: Record<string, { email: string; name: string }> = {}

    if (orderIdsNeedingEnrich.length > 0) {
      const { data: regs } = await supabase
        .from("national_team_event_registrations")
        .select("order_id, parent_email, athlete_first_name, athlete_last_name, event_slug")
        .in("order_id", orderIdsNeedingEnrich)
      for (const r of regs ?? []) {
        const oid = (r as { order_id?: string }).order_id
        if (!oid) continue
        const email = ((r as { parent_email?: string }).parent_email ?? "").trim()
        const first = ((r as { athlete_first_name?: string }).athlete_first_name ?? "").trim()
        const last = ((r as { athlete_last_name?: string }).athlete_last_name ?? "").trim()
        const name = [first, last].filter(Boolean).join(" ") || "Registrant"
        if (email || name) {
          byOrderId[oid] = {
            email: email || (byOrderId[oid]?.email ?? ""),
            name: name || (byOrderId[oid]?.name ?? ""),
            event_slug: (r as { event_slug?: string }).event_slug,
          }
        }
      }
    }

    if (sessionIdsNeedingEnrich.length > 0) {
      const { data: signups } = await supabase
        .from("blue_signups")
        .select("stripe_session_id, parent_email, parent_first_name, parent_last_name")
        .in("stripe_session_id", sessionIdsNeedingEnrich)
      for (const s of signups ?? []) {
        const sid = (s as { stripe_session_id?: string }).stripe_session_id
        if (!sid) continue
        const email = ((s as { parent_email?: string }).parent_email ?? "").trim()
        const first = ((s as { parent_first_name?: string }).parent_first_name ?? "").trim()
        const last = ((s as { parent_last_name?: string }).parent_last_name ?? "").trim()
        const name = [first, last].filter(Boolean).join(" ") || "Blue signup"
        if (email || name) bySessionId[sid] = { email: email || (bySessionId[sid]?.email ?? ""), name: name || (bySessionId[sid]?.name ?? "") }
      }
    }

    const formattedOrders: Order[] = uniqueOrders.map((order: any) => {
      const enriched = byOrderId[order.id] ?? (order.stripe_session_id ? bySessionId[order.stripe_session_id] : null)
      const addr = order.shipping_address || {}
      const firstName = (addr.firstName ?? addr.first_name ?? order.shipping_first_name ?? "").trim()
      const lastName = (addr.lastName ?? addr.last_name ?? order.shipping_last_name ?? "").trim()
      const hasValidAddressName =
        firstName &&
        lastName &&
        firstName !== "Unknown" &&
        firstName !== "Customer" &&
        lastName !== "Customer" &&
        firstName !== "Recovered"

      const rawOrderName = (order.customer_name || "").trim()
      const orderNameNotPlaceholder =
        rawOrderName &&
        !["unknown", "customer", "guest", "recovered"].includes(rawOrderName.toLowerCase())

      const rawOrderEmail = (order.customer_email || "").trim()
      const orderEmailNotPlaceholder =
        rawOrderEmail &&
        rawOrderEmail !== "unknown@example.com" &&
        !rawOrderEmail.toLowerCase().includes("placeholder") &&
        rawOrderEmail.includes("@")

      let customerName: string
      if (enriched?.name) customerName = enriched.name
      else if (orderNameNotPlaceholder) customerName = rawOrderName
      else if (hasValidAddressName) customerName = `${firstName} ${lastName}`
      else if (orderEmailNotPlaceholder && rawOrderEmail) customerName = rawOrderEmail.split("@")[0] || "Guest"
      else customerName = "Guest"

      let customerEmail: string
      if (enriched?.email) customerEmail = enriched.email
      else if (orderEmailNotPlaceholder) customerEmail = rawOrderEmail
      else customerEmail = "—"

      const rawItemsCount = order.order_items?.length || 0
      const orderItems = order.order_items || []
      const shippingMethodStr =
        typeof order.shipping_method === "string"
          ? order.shipping_method
          : (order.shipping_method?.name ?? order.shipping_method?.description ?? "")
      const category = resolveOrderCategory(order, orderItems, {
        nationalTeamRegistration: byOrderId[order.id]?.event_slug
          ? { event_slug: byOrderId[order.id].event_slug }
          : null,
        spartanDonation:
          String(order.channel ?? "").toLowerCase() === "spartan" ? { id: order.id } : null,
      }) as OrderCategory
      const productSummaryStr = productSummary(orderItems, category, shippingMethodStr)
      // When DB has no order_items but we inferred a single-product category, show 1 item so totals make sense
      const itemsCount =
        rawItemsCount > 0
          ? rawItemsCount
          : category === "Blue Sub" || category === "Tournament Fee" || category === "Drop-In" || category === "Donation"
            ? 1
            : 0

      const orderType = resolveOrderType(order)

      const line1 =
        addr.address1 ?? addr.line1 ?? addr.shipping_address_line1 ?? ""
      const line2 =
        addr.address2 ?? addr.line2 ?? addr.shipping_address_line2 ?? null
      const zip =
        addr.zipCode ?? addr.zip ?? addr.postal_code ?? addr.shipping_postal_code ?? ""

      // "Recovered" is the NOT NULL placeholder lib/order-shipping.ts writes when there was
      // no address to store. Harmless on a registration; blocking on something we have to ship.
      const resolvedLine1 = String(line1).trim() || String(order.shipping_address_line1 ?? "").trim()
      const missingShippingAddress =
        orderTypeRequiresAddress(orderType) && (!resolvedLine1 || resolvedLine1 === "Recovered")

      return {
        id: order.id,
        orderNumber: order.order_number || `NC-${String(order.id).slice(0, 8)}`,
        customerName,
        customerEmail,
        date: orderDisplayDateFromRow(order),
        status: (order.status || "pending") as Order["status"],
        items: itemsCount,
        total: Number(order.total ?? 0),
        category,
        productSummary: productSummaryStr,
        orderType,
        missingShippingAddress,
        shippingAddress: {
          line1: String(line1).trim() || "",
          line2: line2 ? String(line2).trim() : null,
          city: String(addr.city ?? addr.shipping_city ?? "").trim(),
          state: String(addr.state ?? addr.shipping_state ?? "").trim(),
          zip: String(zip).trim(),
          country: String(addr.country ?? addr.shipping_country ?? "US").trim(),
          phone: addr.phone ?? addr.shipping_phone ?? null,
        },
        shippingMethod: shippingMethodStr || "Standard Shipping",
        phone: addr.phone ?? addr.shipping_phone ?? null,
      }
    })

    return <AdminOrdersClient initialOrders={formattedOrders} />
  } catch (err: any) {
    console.error("[admin/orders] Page error:", err)
    return <AdminOrdersClient initialOrders={[]} />
  }
}
