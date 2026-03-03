"use server"

import { stripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendOrderConfirmationEmail } from "@/lib/email"

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
  | { success: true; clientSecret: string }
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

    const metadata: Record<string, string> = {
      customer_email: params.customerEmail,
      customer_name: params.customerName,
      shipping_address: JSON.stringify(params.shippingAddress),
      shipping_method: JSON.stringify(params.shippingMethod),
      items: JSON.stringify(
        params.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          variant: i.variant,
          image: i.image,
        }))
      ),
      subtotal: String(params.subtotal),
      shipping: String(params.shipping),
      tax: String(params.tax),
      discount: String(params.discount),
      total: String(params.total),
    }
    if (params.promoCode) metadata.promo_code = params.promoCode

    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata,
      receipt_email: params.customerEmail,
    })

    if (!pi.client_secret) {
      return { success: false, error: "Stripe did not return a client secret." }
    }
    return { success: true, clientSecret: pi.client_secret }
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
  const orderNumber = generateOrderNumber()
  const orderId = crypto.randomUUID()

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: params.customerEmail,
    customer_name: params.customerName,
    shipping_address: params.shippingAddress,
    shipping_method: params.shippingMethod,
    subtotal: params.subtotal,
    shipping_cost: params.shipping,
    tax: params.tax,
    discount: params.discount,
    total: params.total,
    status: "paid",
    stripe_payment_intent_id: null,
    stripe_session_id: null,
    promo_code: params.promoCode ?? null,
  })

  if (orderError) {
    console.error("[store] createFreeOrder insert order:", orderError)
    return { ok: false, error: orderError.message }
  }

  const orderItems = params.items.map((i) => ({
    order_id: orderId,
    product_id: String(i.id),
    product_name: i.name,
    variant: i.variant,
    quantity: i.quantity,
    price: i.price,
    image_url: i.image ?? null,
  }))

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems)
  if (itemsError) {
    console.error("[store] createFreeOrder insert order_items:", itemsError)
    await supabase.from("orders").delete().eq("id", orderId)
    return { ok: false, error: itemsError.message }
  }

  try {
    await sendOrderConfirmationEmail({
      orderNumber,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      items: params.items.map((i) => ({
        name: i.name,
        variant: `${i.variant?.color ?? ""} / ${i.variant?.size ?? ""}`.trim() || "—",
        quantity: i.quantity,
        price: i.price,
      })),
      subtotal: params.subtotal,
      shipping: params.shipping,
      tax: params.tax,
      discount: params.discount,
      total: params.total,
      shippingAddress: params.shippingAddress as Record<string, unknown>,
    })
  } catch (e) {
    console.warn("[store] sendOrderConfirmationEmail failed:", e)
  }

  return { ok: true, orderId }
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
  const payload = parseOrderFromMetadata(metadata)
  if (!payload || !payload.customerEmail) return null

  const orderNumber = generateOrderNumber()
  const orderId = crypto.randomUUID()

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    customer_email: payload.customerEmail,
    customer_name: payload.customerName,
    shipping_address: payload.shippingAddress,
    shipping_method: payload.shippingMethod,
    subtotal: payload.subtotal,
    shipping_cost: payload.shipping,
    tax: payload.tax,
    discount: payload.discount,
    total: payload.total,
    status: "paid",
    stripe_payment_intent_id: paymentIntentId,
    promo_code: payload.promoCode ?? null,
  })

  if (orderError) {
    console.error("[store] createOrderFromPaymentIntentMetadata insert order:", orderError)
    return null
  }

  const orderItems = payload.items.map((i: { id: number; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }) => ({
    order_id: orderId,
    product_id: String(i.id),
    product_name: i.name,
    variant: i.variant,
    quantity: i.quantity,
    price: i.price,
    image_url: i.image ?? null,
  }))

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
  | { success: true; orderId: string; orderNumber: string; totals: Record<string, number>; items: unknown[]; shippingAddress: unknown; shippingMethod: unknown }
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
      }
    }

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    const meta = (pi.metadata || {}) as Record<string, string>
    const created = await createOrderFromPaymentIntentMetadata(supabase, paymentIntentId, meta)
    if (!created) return { success: false, error: "Could not create order from payment." }
    return { success: true, orderId: created.orderId, ...created }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment lookup failed"
    console.error("[store] createOrderFromPaymentIntent:", err)
    return { success: false, error: message }
  }
}

export async function createOrderFromSession(
  sessionId: string
): Promise<
  | { success: true; orderId: string; orderNumber: string; totals: Record<string, number>; items: unknown[]; shippingAddress: unknown; shippingMethod: unknown }
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
      const addr = (session as any).shipping_details?.address
      const shippingAddress = addr ? {
        address1: addr.line1,
        address2: addr.line2 ?? "",
        city: addr.city,
        state: addr.state,
        zipCode: addr.postal_code,
        country: addr.country,
      } : {}
      const subtotal = lineItems.reduce((s: number, li: { amount_subtotal: number }) => s + (li.amount_subtotal ?? 0) / 100, 0)
      const total = (session.amount_total ?? 0) / 100
      await supabase.from("orders").insert({
        id: orderId,
        order_number: orderNumber,
        customer_email: customerEmail,
        customer_name: customerName,
        shipping_address: shippingAddress,
        shipping_method: {},
        subtotal,
        shipping_cost: 0,
        tax: total - subtotal,
        discount: 0,
        total,
        status: "paid",
        stripe_session_id: sessionId,
      })
      for (const li of lineItems) {
        await supabase.from("order_items").insert({
          order_id: orderId,
          product_name: li.description ?? "Item",
          quantity: li.quantity ?? 1,
          price: (li.amount_subtotal ?? 0) / 100 / (li.quantity ?? 1),
        })
      }
      const items = lineItems.map((li: { description: string; quantity: number; amount_subtotal: number }) => ({
        name: li.description ?? "Item",
        variant: {},
        quantity: li.quantity ?? 1,
        price: (li.amount_subtotal ?? 0) / 100 / (li.quantity ?? 1),
      }))
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
    const { error: orderErr } = await supabase.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_email: payload.customerEmail,
      customer_name: payload.customerName,
      shipping_address: payload.shippingAddress,
      shipping_method: payload.shippingMethod,
      subtotal: payload.subtotal,
      shipping_cost: payload.shipping,
      tax: payload.tax,
      discount: payload.discount,
      total: payload.total,
      status: "paid",
      stripe_payment_intent_id: piId,
      stripe_session_id: sessionId,
      promo_code: payload.promoCode ?? null,
    })
    if (orderErr) {
      console.error("[store] createOrderFromSession insert order:", orderErr)
      return { success: false, error: orderErr.message }
    }
    const orderItems = payload.items.map((i: { id: number; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }) => ({
      order_id: orderId,
      product_id: String(i.id),
      product_name: i.name,
      variant: i.variant,
      quantity: i.quantity,
      price: i.price,
      image_url: i.image ?? null,
    }))
    const { error: itemsErr } = await supabase.from("order_items").insert(orderItems)
    if (itemsErr) {
      console.error("[store] createOrderFromSession insert order_items:", itemsErr)
      await supabase.from("orders").delete().eq("id", orderId)
      return { success: false, error: itemsErr.message }
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
