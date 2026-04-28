import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { orderShippingFields } from "@/lib/order-shipping"
import { findAndEnrichAthlete, enrichmentFromOrderCustomer } from "@/lib/enrich-athlete-profile"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const DROP_IN_AMOUNT_MIN_CENTS = 2000
const DROP_IN_AMOUNT_MAX_CENTS = 3000
/** How far back to look for drop-in sessions (seconds). */
const CREATED_SINCE_SEC = 24 * 30 * 24 * 60 * 60 // ~24 months

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** Same heuristic as webhook: amount $20–$30 and (shipping_method suggests drop-in or no store metadata). */
function isLikelyDropIn(session: Stripe.Checkout.Session): boolean {
  const amountTotal = (session.amount_total ?? 0)
  if (amountTotal < DROP_IN_AMOUNT_MIN_CENTS || amountTotal > DROP_IN_AMOUNT_MAX_CENTS) return false
  const hasStoreMetadata = !!(session.metadata?.items && session.metadata?.customer_email)
  const shippingRaw = (session.metadata?.shipping_method ?? "") as string
  const shippingLower = (typeof shippingRaw === "string" ? shippingRaw : "").toLowerCase()
  const looksLikeDropIn =
    shippingLower.includes("practice") ||
    shippingLower.includes("pickup") ||
    shippingLower.includes("suite") ||
    !hasStoreMetadata
  return looksLikeDropIn
}

/**
 * POST: Pull in all drop-in history from Stripe.
 * Lists completed Checkout Sessions (last ~24 months) that look like practice drop-ins,
 * and creates an order + order_items for any that don't already exist in orders.
 * Blue Reports drop-in stats then reflect full history from Stripe.
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!stripeSecret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 503 })
  }

  const stripe = getStripe()
  const admin = createAdminClient()
  const createdSince = Math.floor((Date.now() - CREATED_SINCE_SEC * 1000) / 1000)

  let sessions: Stripe.Checkout.Session[] = []
  try {
    let hasMore = true
    let startingAfter: string | undefined
    while (hasMore) {
      const list = await stripe.checkout.sessions.list({
        status: "complete",
        created: { gte: createdSince },
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      })
      const chunk = list.data ?? []
      sessions = sessions.concat(chunk)
      hasMore = chunk.length === 100 && sessions.length < 2000
      if (chunk.length) startingAfter = chunk[chunk.length - 1].id
      else hasMore = false
    }
  } catch (e) {
    console.error("[blue/sync-drop-ins-from-stripe] list sessions:", e)
    return NextResponse.json({ error: (e as Error).message, synced: 0, skipped: 0, failed: 0 }, { status: 500 })
  }

  const dropInSessions = sessions.filter((s) => isLikelyDropIn(s))
  let synced = 0
  let skipped = 0
  let failed = 0

  for (const session of dropInSessions) {
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id ?? null
    if (!paymentIntentId) {
      skipped += 1
      continue
    }

    const { data: existingOrder } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle()
    if (existingOrder) {
      skipped += 1
      continue
    }

    const amountTotal = (session.amount_total ?? 0) / 100
    let customerEmail =
      (session as { customer_email?: string }).customer_email ??
      (session.customer_details as { email?: string })?.email ??
      ""
    let customerName = ((session.customer_details as { name?: string })?.name ?? "").trim()
    if (!customerEmail || customerEmail.includes("placeholder") || !customerName || customerName === "Customer") {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
        const chargeId = pi.latest_charge
        if (chargeId && typeof chargeId === "string") {
          const charge = await stripe.charges.retrieve(chargeId)
          if (charge.billing_details?.email) customerEmail = charge.billing_details.email
          if (charge.billing_details?.name && (!customerName || customerName === "Customer")) {
            customerName = charge.billing_details.name.trim()
          }
        }
      } catch (_) {}
    }
    if (!customerEmail) customerEmail = `sync-dropin-${session.id.slice(-8)}@placeholder.com`
    if (!customerName) customerName = "Customer"

    const addr = (session.customer_details as { address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string } })?.address
    const shippingAddress = addr
      ? {
          address1: addr.line1 ?? "",
          address2: addr.line2 ?? "",
          city: addr.city ?? "",
          state: addr.state ?? "",
          zipCode: addr.postal_code ?? "",
        }
      : {}
    const dropInName =
      (session as { line_items?: { data?: { description?: string }[] } }).line_items?.data?.[0]?.description ?? "Practice Drop-in"

    const orderNumber = generateOrderNumber()
    const orderId = crypto.randomUUID()
    const { error: orderErr } = await admin.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_email: customerEmail,
      email: customerEmail,
      customer_name: customerName,
      ...orderShippingFields(customerName, shippingAddress),
      shipping_address: shippingAddress,
      shipping_method: { name: "Practice Drop-in", price: 0 },
      subtotal: amountTotal,
      shipping_cost: 0,
      tax: 0,
      discount: 0,
      total: amountTotal,
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      stripe_session_id: session.id,
      promo_code: null,
    })
    if ((orderErr as { code?: string })?.code === "23505") {
      skipped += 1
      continue
    }
    if (orderErr) {
      console.error("[blue/sync-drop-ins-from-stripe] order insert:", orderErr)
      failed += 1
      continue
    }
    const { error: itemsErr } = await admin.from("order_items").insert({
      order_id: orderId,
      product_id: null,
      product_name: dropInName,
      sku: syntheticOrderItemSku({
        productId: null,
        label: dropInName,
        dedupeKey: `drop-in:${paymentIntentId}`,
      }),
      variant: { color: "N/A", size: "N/A" },
      quantity: 1,
      price: amountTotal,
      image_url: null,
    })
    if (itemsErr) {
      console.error("[blue/sync-drop-ins-from-stripe] order_items insert:", itemsErr)
      await admin.from("orders").delete().eq("id", orderId)
      failed += 1
      continue
    }
    try {
      const enrichPayload = enrichmentFromOrderCustomer({
        customer_email: customerEmail,
        customer_name: customerName,
        shipping_address: shippingAddress as Record<string, unknown>,
      })
      await findAndEnrichAthlete(admin, { email: customerEmail, name: customerName }, enrichPayload)
    } catch (_) {}
    synced += 1
  }

  return NextResponse.json({
    message: `Drop-ins: ${synced} synced, ${skipped} already in orders, ${failed} failed.`,
    synced,
    skipped,
    failed,
    totalDropInsInStripe: dropInSessions.length,
  })
}
