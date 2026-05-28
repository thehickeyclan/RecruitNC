import type { SupabaseClient } from "@supabase/supabase-js"
import { findAndEnrichAthlete, enrichmentFromOrderCustomer } from "@/lib/enrich-athlete-profile"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { sendOrderReceiptIfEligible } from "@/lib/order-auto-receipt"
import { flatBillingFromAddress, flatShippingFromAddress, shippingNameFromCustomerName } from "@/lib/order-shipping"

export type StoreCheckoutParams = {
  customerEmail: string
  customerName: string
  shippingAddress: Record<string, unknown>
  shippingMethod: { name: string; price: number; estimatedDays?: string }
  items: Array<{
    id: number
    name: string
    price: number
    quantity: number
    variant: { color: string; size: string }
    image?: string
  }>
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  promoCode?: string
  recruitncUserId?: string | null
}

const ORDER_NUMBER_PREFIX = "NC"

export function generateStoreOrderNumber(): string {
  const t = Date.now().toString(36).toUpperCase().slice(-6)
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${ORDER_NUMBER_PREFIX}-${t}-${r}`
}

function orderRowToTotals(row: {
  subtotal?: number | null
  shipping_cost?: number | null
  tax?: number | null
  discount?: number | null
  total?: number | null
}): Record<string, number> {
  return {
    subtotal: Number(row.subtotal ?? 0),
    shipping: Number(row.shipping_cost ?? 0),
    tax: Number(row.tax ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
  }
}

export function buildStoreOrderItems(
  items: StoreCheckoutParams["items"],
  orderId: string,
  dedupePrefix: string,
) {
  return items.map((i, idx) => {
    const idStr = String(i.id)
    const uuidProduct = /^[0-9a-f-]{36}$/i.test(idStr) ? idStr : null
    const qty = Math.max(1, Number(i.quantity) || 1)
    const unit = Number(i.price)
    return {
      order_id: orderId,
      product_id: idStr,
      product_name: i.name,
      sku: syntheticOrderItemSku({
        productId: uuidProduct,
        sourceId: i.id,
        label: i.name,
        dedupeKey: `${dedupePrefix}:${idx}`,
      }),
      variant: i.variant,
      quantity: i.quantity,
      price: i.price,
      subtotal: (Number.isFinite(unit) ? unit : 0) * qty,
      image_url: i.image ?? null,
    }
  })
}

type InsertStoreOrderOptions = {
  status: "pending" | "paid"
  paymentIntentId?: string | null
  recruitncUserId?: string | null
}

export async function insertStoreOrder(
  supabase: SupabaseClient,
  params: StoreCheckoutParams,
  options: InsertStoreOrderOptions,
): Promise<{ ok: true; orderId: string; orderNumber: string } | { ok: false; error: string }> {
  const orderNumber = generateStoreOrderNumber()
  const orderId = crypto.randomUUID()
  const shippingName = shippingNameFromCustomerName(params.customerName)
  const flatShipping = flatShippingFromAddress(params.shippingAddress)
  const flatBilling = flatBillingFromAddress(params.shippingAddress)

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: params.customerEmail,
    email: params.customerEmail,
    customer_name: params.customerName,
    shipping_first_name: shippingName.shipping_first_name,
    shipping_last_name: shippingName.shipping_last_name,
    billing_first_name: shippingName.shipping_first_name,
    billing_last_name: shippingName.shipping_last_name,
    ...flatShipping,
    ...flatBilling,
    shipping_address: params.shippingAddress,
    shipping_method: params.shippingMethod,
    subtotal: params.subtotal,
    shipping_cost: params.shipping,
    tax: params.tax,
    discount: params.discount,
    total: params.total,
    status: options.status,
    stripe_payment_intent_id: options.paymentIntentId ?? null,
    stripe_session_id: null,
    promo_code: params.promoCode ?? null,
    recruitnc_user_id: options.recruitncUserId ?? null,
  })

  if (orderError) {
    console.error("[store] insertStoreOrder insert order:", orderError)
    return { ok: false, error: orderError.message }
  }

  const orderItems = buildStoreOrderItems(params.items, orderId, orderId)
  const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
  if (itemsError) {
    console.error("[store] insertStoreOrder insert order_items:", itemsError)
    await supabase.from("orders").delete().eq("id", orderId)
    return { ok: false, error: itemsError.message }
  }

  return { ok: true, orderId, orderNumber }
}

export async function deletePendingStoreOrder(supabase: SupabaseClient, orderId: string): Promise<void> {
  await supabase.from("order_items").delete().eq("order_id", orderId)
  await supabase.from("orders").delete().eq("id", orderId).eq("status", "pending")
}

export type FinalizedStoreOrder = {
  orderId: string
  orderNumber: string
  totals: Record<string, number>
  items: Array<{ name: string; variant: unknown; quantity: number; price: number }>
  shippingAddress: unknown
  shippingMethod: unknown
}

async function orderToFinalizedResult(
  supabase: SupabaseClient,
  order: {
    id: string
    order_number: string
    subtotal?: number | null
    shipping_cost?: number | null
    tax?: number | null
    discount?: number | null
    total?: number | null
    shipping_address?: unknown
    shipping_method?: unknown
  },
): Promise<FinalizedStoreOrder> {
  const { data: existingItems } = await supabase
    .from("order_items")
    .select("product_name, variant, quantity, price")
    .eq("order_id", order.id)
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    totals: orderRowToTotals(order),
    items: (existingItems ?? []).map((r: { product_name: string; variant: unknown; quantity: number; price: number }) => ({
      name: r.product_name,
      variant: r.variant,
      quantity: r.quantity,
      price: Number(r.price),
    })),
    shippingAddress: order.shipping_address ?? {},
    shippingMethod: order.shipping_method ?? {},
  }
}

/** Mark a pending checkout order paid and return order details (idempotent). */
export async function finalizePendingStoreOrder(
  supabase: SupabaseClient,
  orderId: string,
  paymentIntentId: string,
  opts?: { sendReceipt?: boolean; enrichAthlete?: boolean },
): Promise<FinalizedStoreOrder | null> {
  const sendReceipt = opts?.sendReceipt !== false
  const enrichAthlete = opts?.enrichAthlete !== false

  const { data: existingByPi } = await supabase
    .from("orders")
    .select("id, order_number, subtotal, shipping_cost, tax, discount, total, shipping_address, shipping_method, customer_email, customer_name, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle()

  if (existingByPi) {
    if (sendReceipt) {
      try {
        await sendOrderReceiptIfEligible(supabase, existingByPi.id)
      } catch (e) {
        console.warn("[store] sendOrderReceiptIfEligible failed:", e)
      }
    }
    return orderToFinalizedResult(supabase, existingByPi)
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, subtotal, shipping_cost, tax, discount, total, shipping_address, shipping_method, customer_email, customer_name, status, stripe_payment_intent_id")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) return null

  if (order.status === "paid") {
    if (!order.stripe_payment_intent_id) {
      await supabase.from("orders").update({ stripe_payment_intent_id: paymentIntentId }).eq("id", orderId)
    }
    if (sendReceipt) {
      try {
        await sendOrderReceiptIfEligible(supabase, order.id)
      } catch (e) {
        console.warn("[store] sendOrderReceiptIfEligible failed:", e)
      }
    }
    return orderToFinalizedResult(supabase, order)
  }

  if (order.status !== "pending") return null

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending")

  if (updateError) {
    const code = (updateError as { code?: string }).code
    if (code === "23505") {
      const { data: raced } = await supabase
        .from("orders")
        .select("id, order_number, subtotal, shipping_cost, tax, discount, total, shipping_address, shipping_method")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle()
      if (raced) return orderToFinalizedResult(supabase, raced)
    }
    console.error("[store] finalizePendingStoreOrder update:", updateError)
    return null
  }

  if (enrichAthlete) {
    try {
      const enrichPayload = enrichmentFromOrderCustomer({
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        shipping_address: (order.shipping_address ?? {}) as Record<string, unknown>,
      })
      await findAndEnrichAthlete(
        supabase,
        { email: order.customer_email, name: order.customer_name },
        enrichPayload,
      )
    } catch (enrichErr) {
      console.error("[store] athlete enrichment from pending order:", enrichErr)
    }
  }

  if (sendReceipt) {
    try {
      await sendOrderReceiptIfEligible(supabase, orderId)
    } catch (e) {
      console.warn("[store] sendOrderReceiptIfEligible failed:", e)
    }
  }

  return orderToFinalizedResult(supabase, order)
}

/** Stripe metadata for store PaymentIntents — order lines live in Supabase, not metadata. */
export function storePaymentIntentMetadata(orderId: string, customerEmail: string, total: number): Record<string, string> {
  return {
    order_id: orderId,
    customer_email: customerEmail,
    source: "store",
    total: String(total),
  }
}
