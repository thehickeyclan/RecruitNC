import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNationalTeamFeeReceiptAutoIfEligible } from "@/lib/national-team-auto-fee-receipt"
import { sendOrderReceiptIfEligible } from "@/lib/order-auto-receipt"
import { findProductByIdOrPrefix } from "@/lib/store/product-utils"
import { findAndEnrichAthlete, enrichmentFromOrderCustomer, buildEnrichmentPayload } from "@/lib/enrich-athlete-profile"
import { orderShippingFields } from "@/lib/order-shipping"
import { completeBlueSignupAfterStripePayment } from "@/lib/blue-signup-webhook-complete"
import {
  processNcUnitedDropInCheckoutFailed,
  processNcUnitedDropInCheckoutSession,
} from "@/lib/nc-united-calendar/process-drop-in-checkout"
import {
  sendFayettevilleDonationAutoAckIfEligible,
  upsertSpartanDonationFromCheckoutSession,
} from "@/lib/spartan-fayetteville-webhook-ack"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { decodeLineItemsMetadata } from "@/lib/nhsca-hub-checkout-pricing"
import { ensureNationalTeamOrderLineItems } from "@/lib/national-team-order-items"
import { finalizePendingStoreOrder } from "@/lib/store/checkout-order"
import {
  isPlaceholderOrderCustomer,
  mergeStripeStoreMetadata,
  normalizeStripeStoreMetadata,
  parseLegacyShippingAddressJson,
  parseLegacyShippingMethodJson,
  parseLegacyStoreItems,
} from "@/lib/store/stripe-legacy-metadata"
import {
  buildTruncatedLegacyOrderNote,
  isTruncatedLegacyStoreMetadata,
  legacyStoreMetadataHasCart,
} from "@/lib/store/legacy-checkout-guard"

export const dynamic = "force-dynamic"

/** One or more signing secrets (comma-separated). Use multiple when different Stripe destinations/endpoints send to this URL so updating one doesn't break others. */
function getWebhookSecrets(): string[] {
  const raw = process.env.STRIPE_WEBHOOK_SECRET ?? ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const stripeSecret = process.env.STRIPE_SECRET_KEY

function getStripe(): Stripe {
  if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY not set")
  return new Stripe(stripeSecret)
}

function generateOrderNumber(): string {
  return "NC-" + Date.now().toString(36).toUpperCase().slice(-6) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
}

/** Persist Stripe metadata on orders for filtering (store vs national team vs drop-in, etc.). */
function channelBusinessFromMetadata(metadata: Stripe.Metadata | Record<string, string> | null | undefined) {
  const m = (metadata ?? {}) as Record<string, string>
  const ch = m.channel?.trim()
  const bus = m.business?.trim()
  return { channel: ch || null, business: bus || null }
}

export async function POST(request: NextRequest) {
  const webhookSecrets = getWebhookSecrets()
  if (webhookSecrets.length === 0 || !stripeSecret) {
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

  let event: Stripe.Event | undefined
  let lastError: string = "Unknown error"
  for (const secret of webhookSecrets) {
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, secret)
      break
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"
      continue
    }
  }
  if (!event) {
    console.error("[webhooks/stripe] Signature verification failed with all configured secrets:", lastError)
    return NextResponse.json(
      {
        error: "Invalid signature",
        hint: "STRIPE_WEBHOOK_SECRET must include the signing secret for the Stripe destination that sent this event. You can set multiple secrets comma-separated (e.g. whsec_Blue,whsec_Store) so Blue, Store, and other flows all work. In Stripe: Event destinations (or Webhooks) → each destination → Signing secret.",
      },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // Real-time churn and billing sync: Stripe subscription lifecycle → blue_memberships
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const subId = subscription.id
    const status = subscription.status
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null
    const isDeleted = event.type === "customer.subscription.deleted"
    const isCanceled = isDeleted || status === "canceled" || status === "unpaid" || status === "incomplete_expired"
    const isPaused = status === "paused"
    const dbStatus = isCanceled ? "cancelled" : isPaused ? "paused" : status === "past_due" ? "active" : status === "active" || status === "trialing" ? "active" : "cancelled"
    const updatePayload: Record<string, unknown> = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
      ...(periodEnd && !isCanceled && { next_billing_at: periodEnd }),
      ...(isCanceled && { ended_at: new Date().toISOString() }),
    }
    const { error } = await admin
      .from("blue_memberships")
      .update(updatePayload)
      .eq("stripe_subscription_id", subId)
    if (error) {
      console.error("[webhooks/stripe] subscription sync blue_memberships:", error.message)
    }
    return NextResponse.json({ received: true })
  }

  /** Blue registration: first invoice often arrives when Checkout webhook is missed or delayed; subscription still has metadata.signup_id from /api/blue/signup */
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null
    if (!subscriptionId) {
      return NextResponse.json({ received: true })
    }
    const stripe = getStripe()
    let sub: Stripe.Subscription
    try {
      sub = await stripe.subscriptions.retrieve(subscriptionId)
    } catch {
      return NextResponse.json({ received: true })
    }
    const signupId = sub.metadata?.signup_id
    if (!signupId) {
      return NextResponse.json({ received: true })
    }
    const admin = createAdminClient()
    const { data: sup } = await admin.from("blue_signups").select("status").eq("id", signupId).maybeSingle()
    // Paid members get a $55 invoice every month (billing_reason=subscription_cycle in Stripe). Those are renewals, not new registrations — we only complete signups still in pending_payment (initial payment or recovery).
    if (!sup || (sup as { status?: string }).status !== "pending_payment") {
      return NextResponse.json({ received: true })
    }
    let checkoutSessionId: string | null = null
    try {
      const sessions = await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 1 })
      checkoutSessionId = sessions.data[0]?.id ?? null
    } catch (_) {}
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null
    const pi =
      typeof invoice.payment_intent === "string"
        ? invoice.payment_intent
        : (invoice.payment_intent as { id?: string })?.id ?? null
    const amountPaid = (invoice.amount_paid ?? 0) / 100
    const customerEmail =
      invoice.customer_email ??
      (invoice as { customer_email?: string }).customer_email ??
      ""
    const customerName = "Blue member"
    const result = await completeBlueSignupAfterStripePayment(admin, getStripe, {
      signupId,
      customerId,
      subscriptionId,
      checkoutSessionId,
      paymentIntentId: pi,
      amountTotalDollars: amountPaid,
      customerEmail,
      customerName,
    })
    if (!result.ok) {
      console.error("[webhooks/stripe] invoice.payment_succeeded Blue signup:", result.error)
      return NextResponse.json({ error: result.error ?? "Blue signup update failed" }, { status: 500 })
    }
    return NextResponse.json({ received: true })
  }

  /** Blue renewals / dunning: invoice outcome → blue_memberships (subscription invoices only) */
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null
    if (!subscriptionId) {
      return NextResponse.json({ received: true })
    }
    const { error } = await admin
      .from("blue_memberships")
      .update({
        status: "pending_payment",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscriptionId)
      .in("status", ["active", "paused", "pending_payment"])
    if (error) {
      console.error("[webhooks/stripe] invoice.payment_failed blue_memberships:", error.message)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice
    const subscriptionId =
      typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id ?? null
    if (!subscriptionId) {
      return NextResponse.json({ received: true })
    }
    let nextBillingAt: string | null = null
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId)
      if (sub.current_period_end) {
        nextBillingAt = new Date(sub.current_period_end * 1000).toISOString()
      }
    } catch (e) {
      console.error("[webhooks/stripe] invoice.paid retrieve subscription:", e)
    }
    const updatePayload: Record<string, unknown> = {
      status: "active",
      updated_at: new Date().toISOString(),
      ended_at: null,
      ...(nextBillingAt && { next_billing_at: nextBillingAt }),
    }
    const { error } = await admin.from("blue_memberships").update(updatePayload).eq("stripe_subscription_id", subscriptionId)
    if (error) {
      console.error("[webhooks/stripe] invoice.paid blue_memberships:", error.message)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "charge.updated") {
    const charge = event.data.object as Stripe.Charge
    if (!charge.payment_intent) return NextResponse.json({ received: true })
    try {
      const stripe = getStripe()
      const pi = await stripe.paymentIntents.retrieve(charge.payment_intent as string)
      const merged = mergeStripeStoreMetadata(
        (pi.metadata || {}) as Record<string, string>,
        (charge.metadata || {}) as Record<string, string>,
      )
      const email =
        (charge.billing_details?.email ?? "").trim() ||
        merged.customer_email?.trim() ||
        ""
      const name =
        (charge.billing_details?.name ?? "").trim() ||
        merged.customer_name?.trim() ||
        ""
      if (!email && !name && !merged.shipping_address) return NextResponse.json({ received: true })

      const orderIdFromMeta = merged.order_id?.trim()
      let orderQuery = admin.from("orders").select("id, customer_email, customer_name, shipping_address, shipping_method")
      if (orderIdFromMeta) {
        orderQuery = orderQuery.eq("id", orderIdFromMeta)
      } else {
        orderQuery = orderQuery.eq("stripe_payment_intent_id", pi.id)
      }
      const { data: order } = await orderQuery.maybeSingle()
      if (!order) return NextResponse.json({ received: true })

      const isPlaceholder = isPlaceholderOrderCustomer(
        (order as { customer_email?: string }).customer_email ?? null,
        (order as { customer_name?: string }).customer_name ?? null,
      )
      const shippingAddress = parseLegacyShippingAddressJson(merged.shipping_address)
      const shippingMethod = parseLegacyShippingMethodJson(merged.shipping_method)
      const addr = (order as { shipping_address?: Record<string, unknown> }).shipping_address ?? {}
      const needsShipping = !String(addr.address1 ?? addr.line1 ?? "").trim()

      if (!isPlaceholder && !needsShipping) return NextResponse.json({ received: true })

      const resolvedName =
        name ||
        [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(" ").trim() ||
        "Customer"
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (isPlaceholder && email) {
        update.customer_email = email
        update.email = email
        update.customer_name = resolvedName
      } else if (isPlaceholder && resolvedName !== "Customer") {
        update.customer_name = resolvedName
      }
      if (needsShipping && Object.keys(shippingAddress).length > 0) {
        update.shipping_address = shippingAddress
        update.shipping_method = shippingMethod
        const parts = resolvedName.split(/\s+/)
        update.shipping_first_name = shippingAddress.firstName ?? parts[0] ?? ""
        update.shipping_last_name = shippingAddress.lastName ?? parts.slice(1).join(" ") ?? ""
        update.shipping_address_line1 = shippingAddress.address1 ?? ""
        update.shipping_address_line2 = shippingAddress.address2 ?? null
        update.shipping_city = shippingAddress.city ?? ""
        update.shipping_state = shippingAddress.state ?? ""
        update.shipping_postal_code = shippingAddress.zipCode ?? ""
        update.shipping_country = shippingAddress.country ?? "US"
        update.shipping_phone = shippingAddress.phone ?? null
      }
      if (Object.keys(update).length > 1) {
        await admin.from("orders").update(update).eq("id", (order as { id: string }).id)
      }
    } catch (e) {
      console.error("[webhooks/stripe] charge.updated error:", e)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    let chargeMeta: Record<string, string> = {}
    if (paymentIntent.latest_charge) {
      try {
        const stripe = getStripe()
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
    const description = (paymentIntent.description || "").toLowerCase()
    const hasStoreMetadata = !!(meta.order_id || meta.items || meta.customer_email)
    const isSubscriptionPayment =
      description.includes("subscription") ||
      (Object.keys(meta).length === 0 && (paymentIntent as { invoice?: string }).invoice) ||
      (!hasStoreMetadata && paymentIntent.amount === 5500)
    if (isSubscriptionPayment) {
      return NextResponse.json({ received: true })
    }

    // Spartan / athlete-page gifts: `checkout.session.completed` owns spartan_donations + ledger + household SMS.
    // PaymentIntent metadata often has email but no store `items` — never synthesize a store order here (order_items.subtotal NOT NULL).
    if (meta.channel === "spartan") {
      return NextResponse.json({ received: true })
    }

    // Fallback: national team checkout (NHSCA bundle, AAU line items, etc.) — mark paid if session.completed missed
    if (!hasStoreMetadata) {
      try {
        const stripe = getStripe()
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 })
        const session = sessions.data[0]
        const regId = session?.metadata?.registration_id
        if (session?.metadata?.source === "national_team" && regId) {
          const admin = createAdminClient()
          const { data: reg } = await admin.from("national_team_event_registrations").select("*").eq("id", regId).single()
          if (reg && reg.status !== "paid") {
            const { data: products } = await admin.from("products").select("id, name, slug").eq("category", "national_team")
            const regEventSlug = String((reg as { event_slug?: string }).event_slug ?? "")
            const bundleSlug = regEventSlug === "aau-2026" ? "aau-2026-bundle" : "nhsca-2026-bundle"
            const bundleProduct =
              (products ?? []).find((p: { slug?: string }) => p.slug === bundleSlug) ??
              (products ?? []).find((p: { slug?: string }) => p.slug === "nhsca-2026-bundle") ??
              (products ?? [])[0]
            const linesEncoded =
              (session.metadata?.checkout_lines as string | undefined) ??
              String((reg as { checkout_lines?: string | null }).checkout_lines ?? "")
            const orderNumber = generateOrderNumber()
            const orderId = crypto.randomUUID()
            const regCents = Number(reg.reg_fee_cents) || 0
            const apparelCents = Number(reg.apparel_fee_cents) || 0
            const totalCents = regCents + apparelCents
            const customerEmail = (reg.parent_email as string) ?? ""
            const customerName = [reg.athlete_first_name, reg.athlete_last_name].filter(Boolean).join(" ") || "National team registrant"
            const { channel: ntChannel, business: ntBusiness } = channelBusinessFromMetadata(session?.metadata)
            const { error: orderErr } = await admin.from("orders").insert({
              id: orderId,
              order_number: orderNumber,
              customer_email: customerEmail,
              email: customerEmail,
              customer_name: customerName,
              ...orderShippingFields(customerName, {}),
              shipping_address: {},
              shipping_method: { name: "National team event", price: 0 },
              subtotal: totalCents / 100,
              shipping_cost: 0,
              tax: 0,
              discount: 0,
              total: totalCents / 100,
              status: "paid",
              stripe_payment_intent_id: paymentIntent.id,
              promo_code: null,
              channel: ntChannel,
              business: ntBusiness,
            })
            let orderIdToUse = orderId
            if ((orderErr as { code?: string })?.code === "23505") {
              const { data: existingOrder } = await admin.from("orders").select("id").eq("stripe_payment_intent_id", paymentIntent.id).maybeSingle()
              orderIdToUse = (existingOrder as { id?: string } | null)?.id ?? orderId
            } else if (!orderErr && totalCents > 0) {
              const bp = bundleProduct as { id?: string; name?: string } | null
              await admin.from("order_items").insert({
                order_id: orderId,
                product_id: bp?.id ?? null,
                product_name: bp?.name ?? "NHSCA 2026 – Registration + Apparel",
                sku: syntheticOrderItemSku({
                  productId: bp?.id ?? null,
                  label: bp?.name ?? "NHSCA 2026 – Registration + Apparel",
                  dedupeKey: paymentIntent.id,
                }),
                variant: { color: "N/A", size: "N/A" },
                quantity: 1,
                price: totalCents / 100,
                subtotal: totalCents / 100,
                image_url: null,
              })
            }
            await admin
              .from("national_team_event_registrations")
              .update({
                status: "paid",
                order_id: orderIdToUse,
                stripe_session_id: session.id,
                stripe_payment_intent_id: paymentIntent.id,
                checkout_lines: linesEncoded.slice(0, 500) || ((reg as { checkout_lines?: string }).checkout_lines ?? null),
                updated_at: new Date().toISOString(),
              })
              .eq("id", regId)
            try {
              const r = reg as { athlete_first_name?: string; athlete_last_name?: string; athlete_email?: string; athlete_phone?: string | null; high_school?: string; club_team?: string | null; graduation_year?: string; primary_weight?: string }
              const enrichPayload = buildEnrichmentPayload({
                contact_email: r.athlete_email,
                phone: r.athlete_phone,
                firstname: r.athlete_first_name,
                lastname: r.athlete_last_name,
                highschool: r.high_school,
                weightclass: r.primary_weight,
                wrestling_club: r.club_team,
              })
              const gradYear = parseInt(String(r.graduation_year ?? ""), 10)
              await findAndEnrichAthlete(admin, {
                email: r.athlete_email,
                name: [r.athlete_first_name, r.athlete_last_name].filter(Boolean).join(" "),
                graduationYear: Number.isFinite(gradYear) ? gradYear : undefined,
                school: r.high_school,
              }, enrichPayload)
            } catch (enrichErr) {
              console.error("[webhooks/stripe] national team athlete enrichment (payment_intent):", enrichErr)
            }
            if (session?.payment_status === "paid") {
              try {
                await sendNationalTeamFeeReceiptAutoIfEligible(admin, {
                  reg: reg as {
                    id: string
                    event_slug: string
                    athlete_first_name: string
                    athlete_last_name: string
                    parent_email: string | null
                    reg_fee_cents: number
                    apparel_fee_cents: number
                  },
                  session,
                })
              } catch (receiptErr) {
                console.error("[webhooks/stripe] national team auto receipt (payment_intent):", receiptErr)
              }
            }
          }
          return NextResponse.json({ received: true })
        }
      } catch (e) {
        console.warn("[webhooks/stripe] national team fallback in payment_intent.succeeded:", e)
      }
      // Legacy NHSCA bundle amount with no store metadata — never synthesize a store order
      if (paymentIntent.amount === 25000) {
        return NextResponse.json({ received: true })
      }
    }

    // Hub checkout (any total): payment_intent often fires before checkout.session.completed and would create a generic store order.
    if (!hasStoreMetadata) {
      try {
        const stripe = getStripe()
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 })
        if (sessions.data[0]?.metadata?.source === "national_team") {
          return NextResponse.json({ received: true })
        }
      } catch (e) {
        console.warn("[webhooks/stripe] national team session check in payment_intent.succeeded:", e)
      }
    }

    let chargeBilling: { email?: string; name?: string } = {}
    if (paymentIntent.latest_charge) {
      try {
        const stripe = getStripe()
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
        chargeBilling = {
          email: charge.billing_details?.email || charge.receipt_email || "",
          name: (charge.billing_details?.name || "").trim() || undefined,
        }
      } catch (_) {}
    }
    let customerEmail =
      (meta.customer_email && meta.customer_email !== "unknown@example.com" ? meta.customer_email : null) ||
      (paymentIntent.receipt_email && paymentIntent.receipt_email !== "unknown@example.com" ? paymentIntent.receipt_email : null) ||
      (chargeBilling.email && !chargeBilling.email.includes("placeholder") ? chargeBilling.email : null) ||
      chargeBilling.email ||
      ""
    if (!customerEmail || customerEmail.includes("placeholder")) customerEmail = chargeBilling.email || paymentIntent.receipt_email || `payment-${paymentIntent.id}@placeholder.com`
    if (!meta.order_id && !meta.customer_email && !meta.items && !chargeBilling.email) {
      return NextResponse.json({ received: true })
    }
    const { data: existing } = await admin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .maybeSingle()
    if (existing) return NextResponse.json({ received: true })

    const pendingOrderId = (meta.order_id || "").trim()
    if (pendingOrderId) {
      const finalized = await finalizePendingStoreOrder(admin, pendingOrderId, paymentIntent.id)
      if (!finalized) {
        console.error("[webhooks/stripe] pending store order finalize failed", {
          orderId: pendingOrderId,
          paymentIntentId: paymentIntent.id,
        })
        return NextResponse.json({ error: "Pending order finalize failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

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
      if (
        (!shippingAddress || Object.keys(shippingAddress).length === 0 || !(shippingAddress as Record<string, string>).address1) &&
        (paymentIntent as { shipping?: { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string }; phone?: string } }).shipping?.address
      ) {
        const ship = (paymentIntent as { shipping?: { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string }; phone?: string } }).shipping!
        const addr = ship.address!
        const nameParts = (ship.name || chargeBilling.name || "").trim().split(/\s+/)
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""
        shippingAddress = {
          firstName,
          lastName,
          address1: addr.line1 ?? "",
          address2: addr.line2 ?? "",
          city: addr.city ?? "",
          state: addr.state ?? "",
          zipCode: addr.postal_code ?? "",
          country: addr.country ?? "US",
          phone: ship.phone ?? "",
          email: customerEmail.includes("placeholder") ? "" : customerEmail,
        }
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
      const customerName =
        (meta.customer_name && meta.customer_name !== "Unknown" ? meta.customer_name.trim() : null) ||
        nameFromAddr ||
        chargeBilling.name ||
        "Customer"
      payload = {
        customerEmail: customerEmail.includes("placeholder") && chargeBilling.email ? chargeBilling.email : customerEmail,
        customerName,
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
    const { data: productCache } = await admin.from("products").select("id, name, image_url").limit(5000)
    const productsList = productCache ?? []
    const truncatedLegacy =
      legacyStoreMetadataHasCart(meta) && isTruncatedLegacyStoreMetadata(meta, productsList)

    if (truncatedLegacy) {
      console.error("[webhooks/stripe] truncated legacy store metadata — order header only", {
        paymentIntentId: paymentIntent.id,
        declared: meta.item_count,
        parsed: payload.items.length,
      })
      const { channel: storeChannel, business: storeBusiness } = channelBusinessFromMetadata(meta)
      const { error: orderError } = await admin.from("orders").insert({
        id: orderId,
        order_number: orderNumber,
        customer_email: payload.customerEmail,
        email: payload.customerEmail,
        customer_name: payload.customerName,
        ...orderShippingFields(payload.customerName, payload.shippingAddress as Record<string, unknown>),
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
        channel: storeChannel,
        business: storeBusiness,
        notes: buildTruncatedLegacyOrderNote(meta, productsList),
      })
      if (orderError) {
        const code = (orderError as { code?: string }).code
        if (code === "23505") return NextResponse.json({ received: true })
        console.error("[webhooks/stripe] truncated legacy order insert:", orderError)
        return NextResponse.json({ error: "Order insert failed" }, { status: 500 })
      }
      try {
        await sendOrderReceiptIfEligible(admin, orderId)
      } catch (emailErr) {
        console.error("[webhooks/stripe] sendOrderReceiptIfEligible failed:", emailErr)
      }
      return NextResponse.json({ received: true })
    }

    if (payload.items.length === 0 && payload.total > 0) {
      payload.items = [
        {
          id: "drop-in",
          name: "NC United Store purchase",
          quantity: 1,
          price: payload.total,
          variant: { color: "", size: "" },
        },
      ]
    }
    const orderItems = payload.items.map((i, idx) => {
      const product = i.id && i.id !== "drop-in" ? findProductByIdOrPrefix(productsList, String(i.id)) : null
      const resolvedProductId = product?.id ?? (typeof i.id === "string" && /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null)
      const name = product?.name || i.name
      const qty = Math.max(1, Number(i.quantity) || 1)
      const unit = Number(i.price)
      const lineSubtotal = (Number.isFinite(unit) ? unit : 0) * qty
      return {
        order_id: orderId,
        product_id: resolvedProductId,
        product_name: name,
        sku: syntheticOrderItemSku({
          productId: resolvedProductId,
          sourceId: i.id,
          label: name,
          dedupeKey: `${paymentIntent.id}:${idx}`,
        }),
        variant: i.variant,
        quantity: i.quantity,
        price: i.price,
        subtotal: lineSubtotal,
        image_url: i.image ?? product?.image_url ?? null,
      }
    })
    const { channel: storeChannel, business: storeBusiness } = channelBusinessFromMetadata(meta)
    const { error: orderError } = await admin.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_email: payload.customerEmail,
      email: payload.customerEmail,
      customer_name: payload.customerName,
      ...orderShippingFields(payload.customerName, payload.shippingAddress as Record<string, unknown>),
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
      channel: storeChannel,
      business: storeBusiness,
    })
    if (orderError) {
      const code = (orderError as { code?: string }).code
      if (code === "23505") {
        return NextResponse.json({ received: true })
      }
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
      await sendOrderReceiptIfEligible(admin, orderId)
    } catch (emailErr) {
      console.error("[webhooks/stripe] sendOrderReceiptIfEligible failed:", emailErr)
    }
    try {
      const enrichPayload = enrichmentFromOrderCustomer({
        customer_email: payload.customerEmail,
        customer_name: payload.customerName,
        shipping_address: payload.shippingAddress as Record<string, unknown>,
      })
      await findAndEnrichAthlete(admin, { email: payload.customerEmail, name: payload.customerName }, enrichPayload)
    } catch (enrichErr) {
      console.error("[webhooks/stripe] athlete enrichment from store order:", enrichErr)
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session
    const admin = createAdminClient()
    if (session.metadata?.channel === "spartan" && session.payment_status === "paid") {
      await upsertSpartanDonationFromCheckoutSession(admin, session)
      await sendFayettevilleDonationAutoAckIfEligible(admin, session)
      return NextResponse.json({ received: true })
    }
    const handledCalendarDropIn = await processNcUnitedDropInCheckoutSession(
      admin,
      session,
      "checkout.session.async_payment_succeeded",
    )
    if (handledCalendarDropIn) {
      return NextResponse.json({ received: true })
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session
    const admin = createAdminClient()
    await processNcUnitedDropInCheckoutFailed(admin, session)
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const admin = createAdminClient()
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id

    const signupId = session.metadata?.signup_id
    if (signupId) {
      let piForOrder = paymentIntentId
      if (!piForOrder && subscriptionId) {
        try {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] })
          const inv = (sub as { latest_invoice?: Stripe.Invoice | string }).latest_invoice
          if (inv && typeof inv === "object" && inv.payment_intent) {
            piForOrder = typeof inv.payment_intent === "string" ? inv.payment_intent : (inv.payment_intent as { id?: string })?.id ?? null
          }
        } catch (_) {}
      }
      const amountTotal = ((session as { amount_total?: number }).amount_total ?? 0) / 100
      const customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? ""
      const customerName = ((session.customer_details as { name?: string })?.name ?? "").trim() || "Blue member"
      const result = await completeBlueSignupAfterStripePayment(admin, getStripe, {
        signupId,
        customerId,
        subscriptionId,
        checkoutSessionId: session.id,
        paymentIntentId: piForOrder ?? null,
        amountTotalDollars: amountTotal,
        customerEmail,
        customerName,
      })
      if (!result.ok) {
        return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    const membershipId = session.metadata?.membership_id
    if (membershipId) {
      let nextBillingAt: string | null = null
      if (subscriptionId) {
        try {
          const sub = await getStripe().subscriptions.retrieve(subscriptionId)
          if (sub.current_period_end) {
            nextBillingAt = new Date(sub.current_period_end * 1000).toISOString()
          }
        } catch (_) {}
      }
      const { error } = await admin
        .from("blue_memberships")
        .update({
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
          ...(nextBillingAt && { next_billing_at: nextBillingAt }),
        })
        .eq("id", membershipId)
      if (error) {
        console.error("[webhooks/stripe] Failed to update blue_memberships:", error.message)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    // National team event registration: create store order (for revenue by product) and mark registration paid
    const registrationId = session.metadata?.registration_id
    const isNationalTeam = session.metadata?.source === "national_team" && registrationId
    if (isNationalTeam && paymentIntentId) {
      const { data: reg } = await admin
        .from("national_team_event_registrations")
        .select("*")
        .eq("id", registrationId)
        .single()
      if (reg) {
        const { data: products } = await admin
          .from("products")
          .select("id, name, slug")
          .eq("category", "national_team")
        const regEventSlug = String((reg as { event_slug?: string }).event_slug ?? "")
        const bundleSlug = regEventSlug === "aau-2026" ? "aau-2026-bundle" : "nhsca-2026-bundle"
        const bundleProduct =
          products?.find((p) => (p as { slug?: string }).slug === bundleSlug) ??
          products?.find((p) => (p as { slug?: string }).slug === "nhsca-2026-bundle") ??
          products?.[0]
        const regCents = Number(reg.reg_fee_cents) || 0
        const apparelCents = Number(reg.apparel_fee_cents) || 0
        const totalCents = regCents + apparelCents
        const customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? reg.parent_email ?? ""
        const customerName = [reg.athlete_first_name, reg.athlete_last_name].filter(Boolean).join(" ") || "National team registrant"
        const { channel: ntSessionChannel, business: ntSessionBusiness } = channelBusinessFromMetadata(session.metadata)
        const linesEncoded =
          (session.metadata?.checkout_lines as string | undefined) ??
          String((reg as { checkout_lines?: string | null }).checkout_lines ?? "")

        let orderIdToUse = (reg.order_id as string | null) ?? null
        const { data: existingByPi } = await admin
          .from("orders")
          .select("id")
          .eq("stripe_payment_intent_id", paymentIntentId)
          .maybeSingle()
        if (existingByPi?.id) orderIdToUse = existingByPi.id

        if (!orderIdToUse && reg.status !== "paid") {
          const orderNumber = generateOrderNumber()
          const orderId = crypto.randomUUID()
          const { error: orderErr } = await admin.from("orders").insert({
            id: orderId,
            order_number: orderNumber,
            customer_email: customerEmail,
            email: customerEmail,
            customer_name: customerName,
            ...orderShippingFields(customerName, {}),
            shipping_address: {},
            shipping_method: { name: "National team event", price: 0 },
            subtotal: totalCents / 100,
            shipping_cost: 0,
            tax: 0,
            discount: 0,
            total: totalCents / 100,
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            promo_code: null,
            channel: ntSessionChannel,
            business: ntSessionBusiness,
          })
          if ((orderErr as { code?: string })?.code === "23505") {
            orderIdToUse = (existingByPi as { id?: string } | null)?.id ?? orderId
          } else if (!orderErr) {
            orderIdToUse = orderId
          }
        }

        if (orderIdToUse && totalCents > 0) {
          await ensureNationalTeamOrderLineItems(admin, {
            orderId: orderIdToUse,
            paymentIntentId,
            linesEncoded,
            totalCents,
            bundleProduct: bundleProduct as { id?: string; name?: string } | null,
          })
          await admin
            .from("orders")
            .update({
              shipping_method: { name: "National team event", price: 0 },
              subtotal: totalCents / 100,
              total: totalCents / 100,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderIdToUse)
        }

        const parentEmail = (reg.parent_email ?? "").trim().toLowerCase()
        let parentUserId: string | null = null
        if (parentEmail) {
          const { data: profile } = await admin
            .from("user_profiles")
            .select("user_id")
            .ilike("email", parentEmail)
            .limit(1)
            .maybeSingle()
          if (profile && (profile as { user_id?: string }).user_id) {
            parentUserId = (profile as { user_id: string }).user_id
          }
        }
        await admin
          .from("national_team_event_registrations")
          .update({
            status: "paid",
            order_id: totalCents > 0 ? orderIdToUse : reg.order_id ?? null,
            stripe_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            checkout_lines: linesEncoded.slice(0, 500) || ((reg as { checkout_lines?: string }).checkout_lines ?? null),
            checkout_mode: (session.metadata?.checkout_mode as string | undefined) ?? (reg as { checkout_mode?: string }).checkout_mode ?? null,
            ...(parentUserId ? { parent_user_id: parentUserId } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", registrationId)
        if (reg.status !== "paid") {
          try {
            const r = reg as { athlete_first_name?: string; athlete_last_name?: string; athlete_email?: string; athlete_phone?: string | null; high_school?: string; club_team?: string | null; graduation_year?: string; primary_weight?: string }
            const enrichPayload = buildEnrichmentPayload({
              contact_email: r.athlete_email,
              phone: r.athlete_phone,
              firstname: r.athlete_first_name,
              lastname: r.athlete_last_name,
              highschool: r.high_school,
              weightclass: r.primary_weight,
              wrestling_club: r.club_team,
            })
            const gradYear = parseInt(String(r.graduation_year ?? ""), 10)
            await findAndEnrichAthlete(admin, {
              email: r.athlete_email,
              name: [r.athlete_first_name, r.athlete_last_name].filter(Boolean).join(" "),
              graduationYear: Number.isFinite(gradYear) ? gradYear : undefined,
              school: r.high_school,
            }, enrichPayload)
          } catch (enrichErr) {
            console.error("[webhooks/stripe] national team athlete enrichment (session):", enrichErr)
          }
        }
        if (session.payment_status === "paid") {
          try {
            await sendNationalTeamFeeReceiptAutoIfEligible(admin, {
              reg: reg as {
                id: string
                event_slug: string
                athlete_first_name: string
                athlete_last_name: string
                parent_email: string | null
                reg_fee_cents: number
                apparel_fee_cents: number
              },
              session,
            })
          } catch (receiptErr) {
            console.error("[webhooks/stripe] national team auto receipt (session):", receiptErr)
          }
        }
      }
      return NextResponse.json({ received: true })
    }

    const handledNcUnitedDropIn = await processNcUnitedDropInCheckoutSession(
      admin,
      session,
      "checkout.session.completed",
    )
    if (handledNcUnitedDropIn) {
      return NextResponse.json({ received: true })
    }

    // Sync Spartan donations to spartan_donations + optional auto 501(c)(3) email (Fayetteville campaign)
    if (session.metadata?.channel === "spartan") {
      await upsertSpartanDonationFromCheckoutSession(admin, session)
      if (session.payment_status === "paid") {
        await sendFayettevilleDonationAutoAckIfEligible(admin, session)
      }
      return NextResponse.json({ received: true })
    }

    const amountTotal = ((session as { amount_total?: number }).amount_total ?? 0) / 100
    const hasStoreMetadata = !!(session.metadata?.order_id || (session.metadata?.items && session.metadata?.customer_email))
    const shippingLower = (session.metadata?.shipping_method as string)?.toLowerCase() ?? ""
    let isLikelyDropIn =
      amountTotal >= 20 &&
      amountTotal <= 30 &&
      (shippingLower.includes("practice") || shippingLower.includes("pickup") || shippingLower.includes("suite") || !hasStoreMetadata)
    let sessionForLineItems: typeof session = session
    if (!isLikelyDropIn && amountTotal >= 20 && amountTotal <= 30) {
      try {
        const expanded = await getStripe().checkout.sessions.retrieve(session.id, { expand: ["line_items"] })
        const desc = (expanded as { line_items?: { data?: { description?: string }[] } }).line_items?.data?.[0]?.description ?? ""
        if (/drop-in|practice/i.test(desc)) {
          isLikelyDropIn = true
          sessionForLineItems = expanded as typeof session
        }
      } catch (_) {
        /* ignore */
      }
    }
    if (paymentIntentId && isLikelyDropIn) {
      const { data: existingOrder } = await admin.from("orders").select("id").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle()
      if (!existingOrder) {
        let customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? ""
        let customerName = ((session.customer_details as { name?: string })?.name ?? "").trim()
        let addr = (session.customer_details as { address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string } })?.address
        if (!customerEmail || customerEmail.includes("placeholder") || !customerName || customerName === "Customer") {
          try {
            const pi = await getStripe().paymentIntents.retrieve(paymentIntentId)
            const chargeId = pi.latest_charge
            if (chargeId && typeof chargeId === "string") {
              const charge = await getStripe().charges.retrieve(chargeId)
              if (charge.billing_details?.email && !customerEmail) customerEmail = charge.billing_details.email
              else if (charge.billing_details?.email && customerEmail.includes("placeholder")) customerEmail = charge.billing_details.email
              if (charge.billing_details?.name && (!customerName || customerName === "Customer")) customerName = charge.billing_details.name.trim()
            }
          } catch (_) {}
        }
        if (!customerEmail) customerEmail = `checkout-${session.id}@placeholder.com`
        if (!customerName) customerName = "Customer"
        const shippingAddress = addr
          ? { address1: addr.line1 ?? "", address2: addr.line2 ?? "", city: addr.city ?? "", state: addr.state ?? "", zipCode: addr.postal_code ?? "" }
          : {}
        const dropInName = (sessionForLineItems as { line_items?: { data?: { description?: string }[] } }).line_items?.data?.[0]?.description ?? "Practice Drop-in"
        const orderNumber = generateOrderNumber()
        const orderId = crypto.randomUUID()
        const { channel: dropInChannel, business: dropInBusiness } = channelBusinessFromMetadata(session.metadata)
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
          channel: dropInChannel,
          business: dropInBusiness,
        })
        if ((orderErr as { code?: string })?.code === "23505") {
          return NextResponse.json({ received: true })
        }
        if (orderErr) {
          console.error("[webhooks/stripe] drop-in order insert:", orderErr)
          return NextResponse.json({ error: "Order insert failed" }, { status: 500 })
        }
        await admin.from("order_items").insert({
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
          subtotal: amountTotal,
          image_url: null,
        })
        try {
          const enrichPayload = enrichmentFromOrderCustomer({
            customer_email: customerEmail,
            customer_name: customerName,
            shipping_address: shippingAddress as Record<string, unknown>,
          })
          await findAndEnrichAthlete(admin, { email: customerEmail, name: customerName }, enrichPayload)
        } catch (enrichErr) {
          console.error("[webhooks/stripe] athlete enrichment from drop-in order:", enrichErr)
        }
        try {
          await sendOrderReceiptIfEligible(admin, orderId)
        } catch (receiptErr) {
          console.error("[webhooks/stripe] drop-in order receipt:", receiptErr)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
