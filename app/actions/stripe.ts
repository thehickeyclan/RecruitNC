"use server"

import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendOrderReceiptIfEligible } from "@/lib/order-auto-receipt"
import { shippingNameFromCustomerName, flatShippingFromAddress, flatBillingFromAddress } from "@/lib/order-shipping"
import { findAndEnrichAthlete, enrichmentFromOrderCustomer } from "@/lib/enrich-athlete-profile"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { resolveOrderItemProductId } from "@/lib/store/product-utils"
import {
  deletePendingStoreOrder,
  finalizePendingStoreOrder,
  insertStoreOrder,
  storePaymentIntentMetadata,
} from "@/lib/store/checkout-order"
import {
  buildTruncatedLegacyOrderNote,
  isTruncatedLegacyStoreMetadata,
  legacyStoreMetadataHasCart,
} from "@/lib/store/legacy-checkout-guard"
import { mergeStripeStoreMetadata } from "@/lib/store/stripe-legacy-metadata"

export type CreatePaymentIntentParams = {
  customerEmail: string
  customerName: string
  shippingAddress: Record<string, unknown>
  shippingMethod: { name: string; price: number; estimatedDays?: string }
  items: Array<{ id: number; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }>
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  promoCode?: string
  /** Logged-in store customer (RecruitNC auth user); stored on order when migration present. */
  recruitncUserId?: string | null
}

const RECRUITNC_AUTH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function recruitncUserIdForOrder(raw: string | null | undefined): string | null {
  const s = (raw || "").trim()
  if (!s || !RECRUITNC_AUTH_UUID.test(s)) return null
  return s
}

const ORDER_NUMBER_PREFIX = "NC"

function generateOrderNumber(): string {
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

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<
  | { success: true; clientSecret: string; orderId: string }
  | { success: true; isFree: true; orderId: string }
  | { success: false; error: string }
> {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return {
        success: false,
        error: "Stripe is not configured. Add STRIPE_SECRET_KEY (and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) in Vercel → Settings → Environment Variables, then redeploy.",
      }
    }

    const supabase = createAdminClient()

    if (params.total <= 0) {
      const free = await createFreeOrderInternal(supabase, params)
      if (!free.ok) return { success: false, error: free.error }
      return { success: true, isFree: true, orderId: free.orderId! }
    }

    const amountCents = Math.round(params.total * 100)
    if (amountCents < 50) {
      return { success: false, error: "Minimum charge is $0.50." }
    }

    const customerEmail = (params.customerEmail || "").trim()
    const customerName = (params.customerName || "").trim() || "Customer"
    if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return { success: false, error: "A valid email address is required for checkout." }
    }

    const rid = recruitncUserIdForOrder(params.recruitncUserId ?? undefined)
    const pending = await insertStoreOrder(
      supabase,
      {
        ...params,
        customerEmail,
        customerName,
      },
      { status: "pending", recruitncUserId: rid },
    )
    if (!pending.ok) return { success: false, error: pending.error }

    const metadata = storePaymentIntentMetadata(pending.orderId, customerEmail, params.total, rid)

    let pi
    try {
      pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata,
        receipt_email: customerEmail,
      })
    } catch (piErr) {
      await deletePendingStoreOrder(supabase, pending.orderId)
      throw piErr
    }

    if (!pi.client_secret) {
      await deletePendingStoreOrder(supabase, pending.orderId)
      return { success: false, error: "Stripe did not return a client secret." }
    }

    await supabase
      .from("orders")
      .update({ stripe_payment_intent_id: pi.id })
      .eq("id", pending.orderId)
      .eq("status", "pending")

    return { success: true, clientSecret: pi.client_secret, orderId: pending.orderId }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment"
    console.error("[store] createPaymentIntent:", err)
    return { success: false, error: message }
  }
}

async function createFreeOrderInternal(
  supabase: ReturnType<typeof createAdminClient>,
  params: CreatePaymentIntentParams
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const ridFree = recruitncUserIdForOrder(params.recruitncUserId ?? undefined)
  const inserted = await insertStoreOrder(supabase, params, {
    status: "paid",
    paymentIntentId: null,
    recruitncUserId: ridFree,
  })
  if (!inserted.ok) return { ok: false, error: inserted.error }

  try {
    await sendOrderReceiptIfEligible(supabase, inserted.orderId)
  } catch (e) {
    console.warn("[store] sendOrderReceiptIfEligible failed:", e)
  }

  return { ok: true, orderId: inserted.orderId }
}

function parseOrderFromMetadata(metadata: Record<string, string>): CreatePaymentIntentParams | null {
  try {
    const items = JSON.parse(metadata.items || "[]") as CreatePaymentIntentParams["items"]
    return {
      customerEmail: metadata.customer_email ?? "",
      customerName: metadata.customer_name ?? "",
      shippingAddress: JSON.parse(metadata.shipping_address || "{}"),
      shippingMethod: JSON.parse(metadata.shipping_method || "{}"),
      items,
      subtotal: Number(metadata.subtotal) || 0,
      shipping: Number(metadata.shipping) || 0,
      tax: Number(metadata.tax) || 0,
      discount: Number(metadata.discount) || 0,
      total: Number(metadata.total) || 0,
      promoCode: metadata.promo_code || undefined,
      recruitncUserId: recruitncUserIdForOrder(metadata.recruitnc_user_id),
    }
  } catch {
    return null
  }
}

async function createOrderFromPaymentIntentMetadata(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntentId: string,
  metadata: Record<string, string>
): Promise<{ orderId: string; orderNumber: string; totals: Record<string, number>; items: unknown[]; shippingAddress: unknown; shippingMethod: unknown } | null> {
  const pendingOrderId = (metadata.order_id || "").trim()
  if (pendingOrderId) {
    return finalizePendingStoreOrder(supabase, pendingOrderId, paymentIntentId)
  }

  const payload = parseOrderFromMetadata(metadata)
  if (!payload || !payload.customerEmail) return null

  const { data: productCache } = await supabase.from("products").select("id, name, image_url").limit(5000)
  const productsList = productCache ?? []
  const truncatedLegacy =
    !pendingOrderId &&
    legacyStoreMetadataHasCart(metadata) &&
    isTruncatedLegacyStoreMetadata(metadata, productsList)

  const orderNumber = generateOrderNumber()
  const orderId = crypto.randomUUID()
  const shippingName = shippingNameFromCustomerName(payload.customerName)
  const flatShipping = flatShippingFromAddress(payload.shippingAddress as Record<string, unknown>)
  const flatBilling = flatBillingFromAddress(payload.shippingAddress as Record<string, unknown>)
  const ridPi = recruitncUserIdForOrder(payload.recruitncUserId ?? undefined)
  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: payload.customerEmail,
    email: payload.customerEmail,
    customer_name: payload.customerName,
    shipping_first_name: shippingName.shipping_first_name,
    shipping_last_name: shippingName.shipping_last_name,
    billing_first_name: shippingName.shipping_first_name,
    billing_last_name: shippingName.shipping_last_name,
    ...flatShipping,
    ...flatBilling,
    shipping_address: payload.shippingAddress,
    shipping_method: payload.shippingMethod,
    order_type: "merchandise",
    subtotal: payload.subtotal,
    shipping_cost: payload.shipping,
    tax: payload.tax,
    discount: payload.discount,
    total: payload.total,
    status: "paid",
    stripe_payment_intent_id: paymentIntentId,
    promo_code: payload.promoCode ?? null,
    recruitnc_user_id: ridPi,
    ...(truncatedLegacy ? { notes: buildTruncatedLegacyOrderNote(metadata, productsList) } : {}),
  })

  if (orderError) {
    const code = (orderError as { code?: string }).code
    if (code === "23505") {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id, order_number, subtotal, shipping_cost, tax, discount, total, shipping_address, shipping_method")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .single()
      if (existingOrder) {
        const { data: existingItems } = await supabase
          .from("order_items")
          .select("product_name, variant, quantity, price")
          .eq("order_id", existingOrder.id)
        const items = (existingItems ?? []).map((r: { product_name: string; variant: unknown; quantity: number; price: number }) => ({
          name: r.product_name,
          variant: r.variant,
          quantity: r.quantity,
          price: Number(r.price),
        }))
        try {
          await sendOrderReceiptIfEligible(supabase, existingOrder.id)
        } catch (e) {
          console.warn("[store] sendOrderReceiptIfEligible failed:", e)
        }
        return {
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          totals: orderRowToTotals(existingOrder),
          items,
          shippingAddress: existingOrder.shipping_address ?? {},
          shippingMethod: existingOrder.shipping_method ?? {},
        }
      }
    }
    console.error("[store] createOrderFromPaymentIntentMetadata insert order:", orderError)
    return null
  }

  if (truncatedLegacy) {
    console.error("[store] refusing partial legacy line items for PI", paymentIntentId, {
      declared: metadata.item_count,
      parsed: payload.items.length,
    })
    return {
      orderId,
      orderNumber,
      totals: orderRowToTotals({
        subtotal: payload.subtotal,
        shipping_cost: payload.shipping,
        tax: payload.tax,
        discount: payload.discount,
        total: payload.total,
      }),
      items: [],
      shippingAddress: payload.shippingAddress,
      shippingMethod: payload.shippingMethod,
    }
  }

  const orderItems = payload.items.map(
    (i: { id: number; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }, idx: number) => {
      const uuidProduct = resolveOrderItemProductId(i.id)
      const qty = Math.max(1, Number(i.quantity) || 1)
      const unit = Number(i.price)
      return {
        order_id: orderId,
        product_id: uuidProduct,
        product_name: i.name,
        sku: syntheticOrderItemSku({
          productId: uuidProduct,
          sourceId: i.id,
          label: i.name,
          dedupeKey: `${paymentIntentId}:${idx}`,
        }),
        variant: i.variant,
        quantity: i.quantity,
        price: i.price,
        subtotal: (Number.isFinite(unit) ? unit : 0) * qty,
        image_url: i.image ?? null,
      }
    },
  )

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
  if (itemsError) {
    console.error("[store] createOrderFromPaymentIntentMetadata insert order_items:", itemsError)
    await supabase.from("orders").delete().eq("id", orderId)
    return null
  }

  const itemsForResponse = payload.items.map((i: { name: string; variant: { color: string; size: string }; quantity: number; price: number }) => ({
    name: i.name,
    variant: i.variant,
    quantity: i.quantity,
    price: i.price,
  }))

  try {
    const enrichPayload = enrichmentFromOrderCustomer({
      customer_email: payload.customerEmail,
      customer_name: payload.customerName,
      shipping_address: payload.shippingAddress as Record<string, unknown>,
    })
    await findAndEnrichAthlete(supabase, { email: payload.customerEmail, name: payload.customerName }, enrichPayload)
  } catch (enrichErr) {
    console.error("[store] athlete enrichment from PI metadata:", enrichErr)
  }

  try {
    await sendOrderReceiptIfEligible(supabase, orderId)
  } catch (e) {
    console.warn("[store] sendOrderReceiptIfEligible failed:", e)
  }

  return {
    orderId,
    orderNumber,
    totals: orderRowToTotals({
      subtotal: payload.subtotal,
      shipping_cost: payload.shipping,
      tax: payload.tax,
      discount: payload.discount,
      total: payload.total,
    }),
    items: itemsForResponse,
    shippingAddress: payload.shippingAddress,
    shippingMethod: payload.shippingMethod,
  }
}

/** Create a minimal order from a Stripe Charge when PI/Session have no metadata (e.g. old or external checkout). */
async function createOrderFromCharge(
  supabase: ReturnType<typeof createAdminClient>,
  paymentIntentId: string,
  chargeId: string
): Promise<{
  orderId: string
  orderNumber: string
  totals: Record<string, number>
  items: unknown[]
  shippingAddress: unknown
  shippingMethod: unknown
} | null> {
  try {
    const charge = await stripe.charges.retrieve(chargeId)
    const amount = (charge.amount ?? 0) / 100
    const billing = charge.billing_details ?? {}
    const addr = billing.address
    const customerEmail = (billing.email ?? "").trim() || `recovered-${paymentIntentId.slice(-8)}@placeholder.com`
    const customerName = (billing.name ?? "").trim() || "Customer"
    const shippingAddress = addr
      ? {
          address1: addr.line1 ?? "",
          address2: addr.line2 ?? "",
          city: addr.city ?? "",
          state: addr.state ?? "",
          zipCode: addr.postal_code ?? "",
          country: addr.country ?? "US",
        }
      : {}

    const orderNumber = generateOrderNumber()
    const orderId = crypto.randomUUID()
    const shippingName = shippingNameFromCustomerName(customerName)
    const flatShipping = flatShippingFromAddress(shippingAddress as Record<string, unknown>)
    const flatBilling = flatBillingFromAddress(shippingAddress as Record<string, unknown>)
    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_email: customerEmail,
      email: customerEmail,
      customer_name: customerName,
      shipping_first_name: shippingName.shipping_first_name,
      shipping_last_name: shippingName.shipping_last_name,
      billing_first_name: shippingName.shipping_first_name,
      billing_last_name: shippingName.shipping_last_name,
      ...flatShipping,
      ...flatBilling,
      shipping_address: shippingAddress,
      shipping_method: { name: "Recovered", price: 0 },
      order_type: "merchandise",
      subtotal: amount,
      shipping_cost: 0,
      tax: 0,
      discount: 0,
      total: amount,
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      promo_code: null,
    })
    if (orderError) {
      console.error("[store] createOrderFromCharge insert order:", orderError)
      return null
    }
    const { error: itemsError } = await supabase.from("order_items").insert({
      order_id: orderId,
      product_id: null,
      product_name: "Recovered item",
      sku: syntheticOrderItemSku({
        productId: null,
        label: "Recovered item",
        dedupeKey: paymentIntentId,
      }),
      variant: { color: "N/A", size: "N/A" },
      quantity: 1,
      price: amount,
      subtotal: amount,
      image_url: null,
    })
    if (itemsError) {
      console.error("[store] createOrderFromCharge insert order_items:", itemsError)
      await supabase.from("orders").delete().eq("id", orderId)
      return null
    }
    try {
      const enrichPayload = enrichmentFromOrderCustomer({
        customer_email: customerEmail,
        customer_name: customerName,
        shipping_address: shippingAddress as Record<string, unknown>,
      })
      await findAndEnrichAthlete(supabase, { email: customerEmail, name: customerName }, enrichPayload)
    } catch (enrichErr) {
      console.error("[store] athlete enrichment from charge:", enrichErr)
    }
    return {
      orderId,
      orderNumber,
      totals: { subtotal: amount, shipping: 0, tax: 0, discount: 0, total: amount },
      items: [{ name: "Recovered item", variant: {}, quantity: 1, price: amount }],
      shippingAddress,
      shippingMethod: { name: "Recovered", price: 0 },
    }
  } catch (err) {
    console.error("[store] createOrderFromCharge:", err)
    return null
  }
}

export async function getOrder(
  orderId: string
): Promise<
  | { success: true; orderNumber: string; totals: Record<string, number>; items: unknown[]; shippingAddress: unknown; shippingMethod: unknown }
  | { success: false; error: string }
> {
  try {
    const supabase = createAdminClient()
    const isUuid = /^[0-9a-f-]{36}$/i.test(orderId)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq(isUuid ? "id" : "order_number", orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: orderError?.message ?? "Order not found." }
    }

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at")

    if (itemsError) {
      return { success: false, error: itemsError.message }
    }

    const items = (orderItems ?? []).map((row: { product_name: string; variant: unknown; quantity: number; price: number }) => ({
      name: row.product_name,
      variant: row.variant,
      quantity: row.quantity,
      price: Number(row.price),
    }))

    return {
      success: true,
      orderNumber: order.order_number,
      totals: orderRowToTotals(order),
      items,
      shippingAddress: order.shipping_address ?? {},
      shippingMethod: order.shipping_method ?? {},
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load order"
    console.error("[store] getOrder:", err)
    return { success: false, error: message }
  }
}

export async function createOrderFromPaymentIntent(
  paymentIntentId: string
): Promise<
  | { success: true; orderId: string; orderNumber: string; totals: Record<string, number>; items: unknown[]; shippingAddress: unknown; shippingMethod: unknown; alreadyExisted?: boolean }
  | { success: false; error?: string }
> {
  try {
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from("orders")
      .select("id, order_number, subtotal, shipping_cost, tax, discount, total, shipping_address, shipping_method")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single()

    if (existing) {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, variant, quantity, price")
        .eq("order_id", existing.id)
      try {
        await sendOrderReceiptIfEligible(supabase, existing.id)
      } catch (e) {
        console.warn("[store] sendOrderReceiptIfEligible failed:", e)
      }
      return {
        success: true,
        orderId: existing.id,
        orderNumber: existing.order_number,
        totals: orderRowToTotals(existing),
        items: (items ?? []).map((r: { product_name: string; variant: unknown; quantity: number; price: number }) => ({
          name: r.product_name,
          variant: r.variant,
          quantity: r.quantity,
          price: Number(r.price),
        })),
        shippingAddress: existing.shipping_address ?? {},
        shippingMethod: existing.shipping_method ?? {},
        alreadyExisted: true,
      }
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    let chargeMeta: Record<string, string> = {}
    const chargeId = pi.latest_charge
    if (chargeId && typeof chargeId === "string") {
      try {
        const charge = await stripe.charges.retrieve(chargeId)
        chargeMeta = (charge.metadata || {}) as Record<string, string>
      } catch {
        // ignore
      }
    }
    const meta = mergeStripeStoreMetadata(
      (pi.metadata || {}) as Record<string, string>,
      chargeMeta,
    )
    let created = await createOrderFromPaymentIntentMetadata(supabase, paymentIntentId, meta)

    // Fallback: Payment Intent from Checkout Session often has no metadata; find Session and create order from it.
    if (!created) {
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 })
      const sessionId = sessions.data?.[0]?.id
      if (sessionId) {
        console.warn("[RecruitNC] recover order: PI metadata empty, using Checkout Session", sessionId)
        const sessionResult = await createOrderFromSession(sessionId)
        if (sessionResult.success) return sessionResult
        return { success: false, error: sessionResult.error ?? "Could not create order from session." }
      }

      // Last resort: create minimal order from Charge (amount + billing_details) so we have a record.
      if (chargeId && typeof chargeId === "string") {
        console.warn("[RecruitNC] recover order: creating minimal order from Charge", chargeId)
        created = await createOrderFromCharge(supabase, paymentIntentId, chargeId)
      }
    }

    if (!created) {
      return {
        success: false,
        error:
          "Could not create order from payment. The Payment Intent has no order metadata, no linked Checkout Session, or charge data could not be used. If this was a store checkout, try recovering by Checkout Session ID (cs_...) if you have it.",
      }
    }
    try {
      await sendOrderReceiptIfEligible(supabase, created.orderId)
    } catch (e) {
      console.warn("[store] sendOrderReceiptIfEligible failed:", e)
    }
    return { success: true, ...created }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment lookup failed"
    console.error("[store] createOrderFromPaymentIntent:", err)
    return { success: false, error: message }
  }
}

export async function createOrderFromSession(
  sessionId: string
): Promise<
  | { success: true; orderId: string; orderNumber: string; totals: Record<string, number>; items: unknown[]; shippingAddress: unknown; shippingMethod: unknown; alreadyExisted?: boolean }
  | { success: false; error?: string }
> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] })
    const supabase = createAdminClient()

    const { data: existingSessionOrder } = await supabase
      .from("orders")
      .select("id, order_number, subtotal, shipping_cost, tax, discount, total, shipping_address, shipping_method")
      .eq("stripe_session_id", sessionId)
      .single()

    if (existingSessionOrder) {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_name, variant, quantity, price")
        .eq("order_id", existingSessionOrder.id)
      try {
        await sendOrderReceiptIfEligible(supabase, existingSessionOrder.id)
      } catch (e) {
        console.warn("[store] sendOrderReceiptIfEligible failed:", e)
      }
      return {
        success: true,
        orderId: existingSessionOrder.id,
        orderNumber: existingSessionOrder.order_number,
        totals: orderRowToTotals(existingSessionOrder),
        items: (orderItems ?? []).map((r: { product_name: string; variant: unknown; quantity: number; price: number }) => ({
          name: r.product_name,
          variant: r.variant,
          quantity: r.quantity,
          price: Number(r.price),
        })),
        shippingAddress: existingSessionOrder.shipping_address ?? {},
        shippingMethod: existingSessionOrder.shipping_method ?? {},
        alreadyExisted: true,
      }
    }

    const metadata = (session.metadata || {}) as Record<string, string>
    const payload = parseOrderFromMetadata(metadata)
    if (!payload) {
      const lineItems = (session as any).line_items?.data ?? []
      if (lineItems.length === 0) return { success: false, error: "Session has no order data." }
      const orderNumber = generateOrderNumber()
      const orderId = crypto.randomUUID()
      const customerEmail = session.customer_email || (session as any).customer_details?.email || ""
      const customerName = (session as any).customer_details?.name || ""
      const addr = (session as any).shipping_details?.address ?? (session as any).customer_details?.address
      const shippingAddress = addr ? {
        address1: addr.line1 ?? "",
        address2: addr.line2 ?? "",
        city: addr.city ?? "",
        state: addr.state ?? "",
        zipCode: addr.postal_code ?? "",
        country: addr.country ?? "US",
      } : {}
      const subtotal = lineItems.reduce((s: number, li: { amount_subtotal: number }) => s + (li.amount_subtotal ?? 0) / 100, 0)
      const total = (session.amount_total ?? 0) / 100
      const piId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id ?? null
      const shippingName = shippingNameFromCustomerName(customerName)
      const flatShipping = flatShippingFromAddress(shippingAddress as Record<string, unknown>)
      const flatBilling = flatBillingFromAddress(shippingAddress as Record<string, unknown>)
      const sessMeta = (session.metadata || {}) as Record<string, string>
      const ridNoPayload = recruitncUserIdForOrder(sessMeta.recruitnc_user_id)
      await supabase.from("orders").insert({
        id: orderId,
        order_number: orderNumber,
        customer_email: customerEmail,
        email: customerEmail,
        customer_name: customerName,
        shipping_first_name: shippingName.shipping_first_name,
        shipping_last_name: shippingName.shipping_last_name,
        billing_first_name: shippingName.shipping_first_name,
        billing_last_name: shippingName.shipping_last_name,
        ...flatShipping,
        ...flatBilling,
        shipping_address: shippingAddress,
        shipping_method: {},
        order_type: "merchandise",
        subtotal,
        shipping_cost: 0,
        tax: total - subtotal,
        discount: 0,
        total,
        status: "paid",
        stripe_session_id: sessionId,
        stripe_payment_intent_id: piId,
        recruitnc_user_id: ridNoPayload,
      })
      for (let idx = 0; idx < lineItems.length; idx++) {
        const li = lineItems[idx] as { id?: string; description?: string; quantity?: number; amount_subtotal?: number }
        const q = Math.max(1, li.quantity ?? 1)
        const lineCents = li.amount_subtotal ?? 0
        const lineTotal = lineCents / 100
        await supabase.from("order_items").insert({
          order_id: orderId,
          product_name: li.description ?? "Item",
          sku: syntheticOrderItemSku({
            productId: null,
            sourceId: li.id ?? null,
            label: li.description ?? "Item",
            dedupeKey: `${orderId}:${li.id ?? idx}`,
          }),
          variant: { color: "N/A", size: "N/A" },
          quantity: q,
          price: lineTotal / q,
          subtotal: lineTotal,
        })
      }
      try {
        const enrichPayload = enrichmentFromOrderCustomer({
          customer_email: customerEmail,
          customer_name: customerName,
          shipping_address: shippingAddress as Record<string, unknown>,
        })
        await findAndEnrichAthlete(supabase, { email: customerEmail, name: customerName }, enrichPayload)
      } catch (enrichErr) {
        console.error("[store] athlete enrichment from session (no metadata):", enrichErr)
      }
      const items = lineItems.map((li: { description: string; quantity: number; amount_subtotal: number }) => ({
        name: li.description ?? "Item",
        variant: {},
        quantity: li.quantity ?? 1,
        price: (li.amount_subtotal ?? 0) / 100 / (li.quantity ?? 1),
      }))
      try {
        await sendOrderReceiptIfEligible(supabase, orderId)
      } catch (e) {
        console.warn("[store] sendOrderReceiptIfEligible failed:", e)
      }
      return {
        success: true,
        orderId,
        orderNumber,
        totals: { subtotal, shipping: 0, tax: total - subtotal, discount: 0, total },
        items,
        shippingAddress,
        shippingMethod: {},
      }
    }

    const orderNumber = generateOrderNumber()
    const orderId = crypto.randomUUID()
    const piId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as any)?.id ?? null
    const shippingName = shippingNameFromCustomerName(payload.customerName)
    const flatShipping = flatShippingFromAddress(payload.shippingAddress as Record<string, unknown>)
    const flatBilling = flatBillingFromAddress(payload.shippingAddress as Record<string, unknown>)
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_email: payload.customerEmail,
      email: payload.customerEmail,
      customer_name: payload.customerName,
      shipping_first_name: shippingName.shipping_first_name,
      shipping_last_name: shippingName.shipping_last_name,
      billing_first_name: shippingName.shipping_first_name,
      billing_last_name: shippingName.shipping_last_name,
      ...flatShipping,
      ...flatBilling,
      shipping_address: payload.shippingAddress,
      shipping_method: payload.shippingMethod,
      order_type: "merchandise",
      subtotal: payload.subtotal,
      shipping_cost: payload.shipping,
      tax: payload.tax,
      discount: payload.discount,
      total: payload.total,
      status: "paid",
      stripe_payment_intent_id: piId,
      stripe_session_id: sessionId,
      promo_code: payload.promoCode ?? null,
      recruitnc_user_id: recruitncUserIdForOrder(payload.recruitncUserId ?? undefined),
    })
    if (orderErr) {
      console.error("[store] createOrderFromSession insert order:", orderErr)
      return { success: false, error: orderErr.message }
    }
    const orderItems = payload.items.map(
      (i: { id: number; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }, idx: number) => {
        const uuidProduct = resolveOrderItemProductId(i.id)
        const qty = Math.max(1, Number(i.quantity) || 1)
        const unit = Number(i.price)
        return {
          order_id: orderId,
          product_id: uuidProduct,
          product_name: i.name,
          sku: syntheticOrderItemSku({
            productId: uuidProduct,
            sourceId: i.id,
            label: i.name,
            dedupeKey: `${piId ?? sessionId}:${idx}`,
          }),
          variant: i.variant,
          quantity: i.quantity,
          price: i.price,
          subtotal: (Number.isFinite(unit) ? unit : 0) * qty,
          image_url: i.image ?? null,
        }
      },
    )
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems)
    if (itemsErr) {
      console.error("[store] createOrderFromSession insert order_items:", itemsErr)
      await supabase.from("orders").delete().eq("id", orderId)
      return { success: false, error: itemsErr.message }
    }
    try {
      const enrichPayload = enrichmentFromOrderCustomer({
        customer_email: payload.customerEmail,
        customer_name: payload.customerName,
        shipping_address: payload.shippingAddress as Record<string, unknown>,
      })
      await findAndEnrichAthlete(supabase, { email: payload.customerEmail, name: payload.customerName }, enrichPayload)
    } catch (enrichErr) {
      console.error("[store] athlete enrichment from session:", enrichErr)
    }
    try {
      await sendOrderReceiptIfEligible(supabase, orderId)
    } catch (e) {
      console.warn("[store] sendOrderReceiptIfEligible failed:", e)
    }
    return {
      success: true,
      orderId,
      orderNumber,
      totals: orderRowToTotals({ subtotal: payload.subtotal, shipping_cost: payload.shipping, tax: payload.tax, discount: payload.discount, total: payload.total }),
      items: payload.items.map((i: { name: string; variant: { color: string; size: string }; quantity: number; price: number }) => ({ name: i.name, variant: i.variant, quantity: i.quantity, price: i.price })),
      shippingAddress: payload.shippingAddress,
      shippingMethod: payload.shippingMethod,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session lookup failed"
    console.error("[store] createOrderFromSession:", err)
    return { success: false, error: message }
  }
}
