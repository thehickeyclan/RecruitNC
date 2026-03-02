import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendOrderConfirmationEmail } from "@/lib/email"
import { findProductByIdOrPrefix } from "@/lib/store/product-utils"

export const dynamic = "force-dynamic"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export async function POST(request: NextRequest) {
  if (!webhookSecret || !stripeSecret) {
    console.error("[webhooks/stripe] STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[webhooks/stripe] Signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const admin = createAdminClient()

  if (event.type === "charge.updated") {
    const charge = event.data.object as Stripe.Charge
    if (!charge.billing_details?.email || !charge.payment_intent) return NextResponse.json({ received: true })
    try {
      const stripe = getStripe()
      const pi = await stripe.paymentIntents.retrieve(charge.payment_intent as string)
      const orderId = (pi.metadata as Record<string, string> | null)?.order_id
      if (!orderId) return NextResponse.json({ received: true })
      const { data: order } = await admin.from("orders").select("id, customer_email, customer_name").eq("id", orderId).single()
      if (!order) return NextResponse.json({ received: true })
      const isPlaceholder =
        (order as { customer_email?: string }).customer_email === "unknown@example.com" ||
        (order as { customer_name?: string }).customer_name === "Unknown" ||
        !(order as { customer_name?: string }).customer_name?.trim()
      if (!isPlaceholder) return NextResponse.json({ received: true })
      const name = charge.billing_details.name || ""
      const parts = name.trim().split(/\s+/)
      const firstName = parts[0] || "Customer"
      const lastName = parts.slice(1).join(" ") || ""
      await admin
        .from("orders")
        .update({
          customer_email: charge.billing_details.email,
          customer_name: name.trim() || "Customer",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
    } catch (e) {
      console.error("[webhooks/stripe] charge.updated error:", e)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const meta = (paymentIntent.metadata || {}) as Record<string, string>
    let customerEmail = meta.customer_email
    if (!customerEmail && paymentIntent.receipt_email) customerEmail = paymentIntent.receipt_email
    if (!customerEmail && paymentIntent.latest_charge) {
      try {
        const stripe = getStripe()
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
        customerEmail = charge.billing_details?.email || charge.receipt_email || ""
      } catch (_) {}
    }
    if (!customerEmail) customerEmail = `payment-${paymentIntent.id}@placeholder.com`
    if (!meta.customer_email && !meta.items) {
      return NextResponse.json({ received: true })
    }
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ received: true })
    const orderNumber = generateOrderNumber()
    const orderId = crypto.randomUUID()
    let payload: {
      customerEmail: string
      customerName: string
      shippingAddress: Record<string, unknown>
      shippingMethod: Record<string, unknown>
      items: Array<{ id: number | string; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }>
      subtotal: number
      shipping: number
      tax: number
      discount: number
      total: number
      promoCode?: string
    }
    try {
      let shippingAddress: Record<string, unknown> = {}
      try {
        shippingAddress = JSON.parse(meta.shipping_address || "{}") as Record<string, unknown>
        if (shippingAddress && typeof shippingAddress === "object" && !shippingAddress.firstName && (shippingAddress as Record<string, string>).fn) {
          const r = shippingAddress as Record<string, string>
          shippingAddress = { firstName: r.fn, lastName: r.ln, address1: r.a1 || r.address1, address2: r.a2 || r.address2, city: r.c || r.city, state: r.s || r.state, zipCode: r.z || r.zipCode }
        }
      } catch {
        shippingAddress = {}
      }
      let shippingMethod: { name: string; price: number } = { name: "Standard Shipping", price: 0 }
      try {
        const parsed = JSON.parse(meta.shipping_method || "{}") as Record<string, unknown>
        if (parsed && typeof parsed === "object") shippingMethod = { name: (parsed.name as string) || (parsed.n as string) || "Standard Shipping", price: Number(parsed.price ?? parsed.p ?? 0) }
      } catch {
        // keep default
      }
      let items: Array<{ id: number | string; name: string; price: number; quantity: number; variant: { color: string; size: string }; image?: string }> = []
      try {
        const raw = JSON.parse(meta.items || "[]") as Record<string, unknown>[]
        items = raw.map((item) => {
          const v = item.variant as { color: string; size: string } | undefined
          const vStr = typeof item.v === "string" ? item.v : ""
          const variant = v ?? (vStr ? { color: vStr.split("/")[0]?.trim() || "N/A", size: vStr.split("/")[1]?.trim() || "N/A" } : { color: "N/A", size: "N/A" })
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
        items = []
      }
      const addr = shippingAddress as Record<string, string>
      const nameFromAddr = [addr.firstName, addr.lastName].filter(Boolean).join(" ") || ""
      payload = {
        customerEmail,
        customerName: meta.customer_name ?? (nameFromAddr || "Customer"),
        shippingAddress,
        shippingMethod,
        items,
        subtotal: Number(meta.subtotal) || 0,
        shipping: Number(meta.shipping) || 0,
        tax: Number(meta.tax) || 0,
        discount: Number(meta.discount) || 0,
        total: Number(meta.total) || paymentIntent.amount / 100,
        promoCode: meta.promo_code || undefined,
      }
    } catch {
      return NextResponse.json({ received: true })
    }
    if (payload.items.length === 0 && payload.total > 0) {
      payload.items = [{ id: "drop-in", name: "Order items", quantity: 1, price: payload.total, variant: { color: "N/A", size: "N/A" } }]
    }
    const { data: productCache } = await admin.from("products").select("id, name, image_url").limit(5000)
    const productsList = productCache ?? []
    const orderItems = payload.items.map((i) => {
      const product = i.id && i.id !== "drop-in" ? findProductByIdOrPrefix(productsList, String(i.id)) : null
      return {
        order_id: orderId,
        product_id: product?.id ?? (typeof i.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null),
        product_name: product?.name || i.name,
        variant: i.variant,
        quantity: i.quantity,
        price: i.price,
        image_url: i.image ?? product?.image_url ?? null,
      }
    })
    const { error: orderError } = await admin.from("orders").insert({
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
      stripe_payment_intent_id: paymentIntent.id,
      promo_code: payload.promoCode ?? null,
    })
    if (orderError) {
      console.error("[webhooks/stripe] store order insert:", orderError)
      return NextResponse.json({ error: "Order insert failed" }, { status: 500 })
    }
    const { error: itemsError } = await admin.from("order_items").insert(orderItems)
    if (itemsError) {
      console.error("[webhooks/stripe] store order_items insert:", itemsError)
      await admin.from("orders").delete().eq("id", orderId)
      return NextResponse.json({ error: "Order items insert failed" }, { status: 500 })
    }
    try {
      await sendOrderConfirmationEmail({
        orderNumber,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        items: payload.items.map((i) => ({ name: i.name, variant: `${i.variant?.color ?? ""} / ${i.variant?.size ?? ""}`.trim() || "—", quantity: i.quantity, price: i.price })),
        subtotal: payload.subtotal,
        shipping: payload.shipping,
        tax: payload.tax,
        discount: payload.discount,
        total: payload.total,
        shippingAddress: payload.shippingAddress as Record<string, unknown>,
      })
    } catch (emailErr) {
      console.error("[webhooks/stripe] sendOrderConfirmationEmail failed:", emailErr)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const admin = createAdminClient()
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null

    const signupId = session.metadata?.signup_id
    if (signupId) {
      const { error } = await admin
        .from("blue_signups")
        .update({
          status: "paid",
          stripe_session_id: session.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", signupId)
      if (error) {
        console.error("[webhooks/stripe] Failed to update blue_signups:", error.message)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    const membershipId = session.metadata?.membership_id
    if (membershipId) {
      const { error } = await admin
        .from("blue_memberships")
        .update({
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", membershipId)
      if (error) {
        console.error("[webhooks/stripe] Failed to update blue_memberships:", error.message)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id
    const amountTotal = ((session as { amount_total?: number }).amount_total ?? 0) / 100
    const hasStoreMetadata = !!(session.metadata?.items && session.metadata?.customer_email)
    const shippingLower = (session.metadata?.shipping_method as string)?.toLowerCase() ?? ""
    const isLikelyDropIn =
      amountTotal >= 20 &&
      amountTotal <= 30 &&
      (shippingLower.includes("practice") || shippingLower.includes("pickup") || shippingLower.includes("suite") || !hasStoreMetadata)
    if (paymentIntentId && isLikelyDropIn) {
      const { data: existingOrder } = await admin.from("orders").select("id").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle()
      if (!existingOrder) {
        const customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? `checkout-${session.id}@placeholder.com`
        const name = (session.customer_details as { name?: string })?.name ?? ""
        const customerName = name.trim() || "Customer"
        const addr = (session.customer_details as { address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string } })?.address
        const shippingAddress = addr
          ? { address1: addr.line1 ?? "", address2: addr.line2 ?? "", city: addr.city ?? "", state: addr.state ?? "", zipCode: addr.postal_code ?? "" }
          : {}
        const dropInName = (session as { line_items?: { data?: { description?: string }[] } }).line_items?.data?.[0]?.description ?? "Practice Drop-in"
        const orderNumber = generateOrderNumber()
        const orderId = crypto.randomUUID()
        const { error: orderErr } = await admin.from("orders").insert({
          id: orderId,
          order_number: orderNumber,
          customer_email: customerEmail,
          customer_name: customerName,
          shipping_address: shippingAddress,
          shipping_method: { name: "Practice Drop-in", price: 0 },
          subtotal: amountTotal,
          shipping_cost: 0,
          tax: 0,
          discount: 0,
          total: amountTotal,
          status: "paid",
          stripe_payment_intent_id: paymentIntentId,
          promo_code: null,
        })
        if (!orderErr) {
          await admin.from("order_items").insert({
            order_id: orderId,
            product_id: null,
            product_name: dropInName,
            variant: { color: "N/A", size: "N/A" },
            quantity: 1,
            price: amountTotal,
            image_url: null,
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
