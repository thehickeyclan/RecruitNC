import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { orderShippingFields } from "@/lib/order-shipping"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { isGenericPlaceholderOrderItemName } from "@/lib/nhsca-hub-checkout-pricing"
import { isGuildCheckoutSession } from "@/lib/stripe-guild-detection"

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

async function resolveGuildLineItemName(
  session: Stripe.Checkout.Session,
  getStripe: () => Stripe,
): Promise<string> {
  const meta = (session.metadata ?? {}) as Record<string, string>
  const fromMeta =
    meta.product_name?.trim() ||
    meta.session_title?.trim() ||
    meta.booking_title?.trim() ||
    meta.line_item_name?.trim()
  if (fromMeta) return fromMeta

  try {
    const expanded = await getStripe().checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price.product"],
    })
    const line = expanded.line_items?.data?.[0]
    const desc = line?.description?.trim()
    if (desc) return desc
    const product = line?.price?.product
    if (product && typeof product === "object" && "name" in product) {
      const name = (product as { name?: string }).name?.trim()
      if (name) return name
    }
  } catch (e) {
    console.warn("[stripe-guild-order] expand line_items failed:", e)
  }

  return "Wrestling Guild booking"
}

/**
 * Idempotent: creates or re-tags a RecruitNC `orders` row for Wrestling Guild checkout.
 * Guild owns fulfillment; RecruitNC only mirrors for admin revenue reporting.
 */
export async function upsertGuildOrderFromCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
  options: { getStripe: () => Stripe },
): Promise<string | null> {
  if (!isGuildCheckoutSession(session)) return null

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
  if (!paymentIntentId) return null

  const amountTotalCents = session.amount_total ?? 0
  const amountTotal = amountTotalCents / 100
  const customerEmail =
    (session as { customer_email?: string }).customer_email ??
    (session.customer_details as { email?: string })?.email ??
    ""
  const customerName = ((session.customer_details as { name?: string })?.name ?? "").trim() || "Guild customer"
  const lineName = await resolveGuildLineItemName(session, options.getStripe)
  const meta = (session.metadata ?? {}) as Record<string, string>
  const channel = meta.channel?.trim() || "guild"
  const business = meta.business?.trim() || "wrestling_guild"

  const { data: existing } = await admin
    .from("orders")
    .select("id, channel")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()

  if (existing?.id) {
    await admin
      .from("orders")
      .update({
        channel,
        business,
        shipping_method: { name: "Wrestling Guild", price: 0 },
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)

    const { data: items } = await admin
      .from("order_items")
      .select("id, product_name")
      .eq("order_id", existing.id)

    const placeholder = (items ?? []).filter((i) =>
      isGenericPlaceholderOrderItemName(String((i as { product_name?: string }).product_name ?? "")),
    )
    if (placeholder.length === 1 && lineName !== "Wrestling Guild booking") {
      await admin
        .from("order_items")
        .update({ product_name: lineName })
        .eq("id", (placeholder[0] as { id: string }).id)
    }

    return existing.id
  }

  const orderNumber = generateOrderNumber()
  const orderId = crypto.randomUUID()
  const { error: orderErr } = await admin.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: customerEmail || `guild-${session.id}@placeholder.com`,
    email: customerEmail || `guild-${session.id}@placeholder.com`,
    customer_name: customerName,
    ...orderShippingFields(customerName, {}),
    shipping_address: {},
    shipping_method: { name: "Wrestling Guild", price: 0 },
    subtotal: amountTotal,
    shipping_cost: 0,
    tax: 0,
    discount: 0,
    total: amountTotal,
    status: "paid",
    stripe_payment_intent_id: paymentIntentId,
    stripe_session_id: session.id,
    promo_code: null,
    channel,
    business,
  })

  if ((orderErr as { code?: string })?.code === "23505") {
    const { data: race } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle()
    return (race as { id?: string } | null)?.id ?? null
  }
  if (orderErr) {
    console.error("[stripe-guild-order] insert failed:", orderErr)
    throw orderErr
  }

  if (amountTotal > 0) {
    await admin.from("order_items").insert({
      order_id: orderId,
      product_id: null,
      product_name: lineName,
      sku: syntheticOrderItemSku({
        productId: null,
        label: lineName,
        dedupeKey: `guild:${paymentIntentId}`,
      }),
      variant: { color: "N/A", size: "N/A" },
      quantity: 1,
      price: amountTotal,
      subtotal: amountTotal,
      image_url: null,
    })
  }

  return orderId
}
