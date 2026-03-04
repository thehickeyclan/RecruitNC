import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendOrderConfirmationEmail } from "@/lib/email"
import { findProductByIdOrPrefix } from "@/lib/store/product-utils"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"

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
    const dbStatus = isCanceled ? "cancelled" : status === "past_due" ? "active" : status === "active" || status === "trialing" ? "active" : "cancelled"
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
    if (!meta.customer_email && !meta.items && !chargeBilling.email) {
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
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id

    const signupId = session.metadata?.signup_id
    if (signupId) {
      const { error: signupUpdateErr } = await admin
        .from("blue_signups")
        .update({
          status: "paid",
          stripe_session_id: session.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", signupId)
      if (signupUpdateErr) {
        console.error("[webhooks/stripe] Failed to update blue_signups:", signupUpdateErr.message)
        return NextResponse.json({ error: "Update failed" }, { status: 500 })
      }
      // Ensure blue_memberships row exists so reports (MRR, active count) stay correct
      if (subscriptionId) {
        const { data: existingMembership } = await admin
          .from("blue_memberships")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle()
        if (!existingMembership) {
          const { data: signupRow } = await admin
            .from("blue_signups")
            .select("parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_weight_class, tshirt_size")
            .eq("id", signupId)
            .single()
          if (signupRow) {
            const parentEmail = (signupRow.parent_email as string)?.trim()?.toLowerCase() || ""
            const gradYear = Number(signupRow.athlete_graduation_year)
            const athleteName = [
              (signupRow.athlete_first_name as string)?.trim(),
              (signupRow.athlete_last_name as string)?.trim(),
            ].filter(Boolean).join(" ").trim()
            const highSchool = (signupRow.athlete_high_school as string)?.trim() || ""
            let payerUserId: string | null = null
            const { data: profileRow } = await admin
              .from("user_profiles")
              .select("user_id")
              .ilike("email", parentEmail)
              .limit(1)
              .maybeSingle()
            if (profileRow?.user_id) {
              payerUserId = profileRow.user_id as string
            } else if (parentEmail) {
              const randomPassword = "blue-" + crypto.randomUUID() + "-" + Math.random().toString(36).slice(2, 14)
              const { data: newUser, error: createUserErr } = await admin.auth.admin.createUser({
                email: parentEmail,
                password: randomPassword,
                email_confirm: true,
                user_metadata: {
                  full_name: [(signupRow.parent_first_name as string), (signupRow.parent_last_name as string)].filter(Boolean).join(" ").trim(),
                  first_name: (signupRow.parent_first_name as string)?.trim(),
                  last_name: (signupRow.parent_last_name as string)?.trim(),
                  profile_type: "parent",
                },
              })
              if (!createUserErr && newUser?.user?.id) {
                payerUserId = newUser.user.id
                await admin.from("user_profiles").insert({
                  user_id: newUser.user.id,
                  email: newUser.user.email,
                  full_name: newUser.user.user_metadata?.full_name ?? parentEmail,
                  first_name: newUser.user.user_metadata?.first_name ?? null,
                  last_name: newUser.user.user_metadata?.last_name ?? null,
                  profile_type: "parent",
                  role: "user",
                  is_admin: false,
                })
              }
            }
            if (payerUserId && athleteName && Number.isFinite(gradYear) && gradYear >= 2020 && gradYear <= 2040) {
              const existingAthlete = await findExistingAthlete(admin, {
                name: athleteName,
                graduationYear: gradYear,
                school: highSchool,
              })
              let athleteId: string | undefined = existingAthlete?.id
              if (!athleteId) {
                const columns = await getAthletesColumnNames(admin)
                const athletePayload = filterPayloadToSchema({
                  name: athleteName,
                  firstName: (signupRow.athlete_first_name as string)?.trim(),
                  lastName: (signupRow.athlete_last_name as string)?.trim(),
                  graduationyear: gradYear,
                  highschool: highSchool,
                  weightclass: (signupRow.athlete_weight_class as string)?.trim() || null,
                  ncUnitedTeam: "blue",
                  recruiting_status: "Uncommitted",
                  is_prospect: true,
                  profile_verified: false,
                  updated_at: new Date().toISOString(),
                }, columns)
                const { data: newAthlete, error: athleteErr } = await admin
                  .from("athletes")
                  .insert(athletePayload)
                  .select("id")
                  .single()
                if (athleteErr || !newAthlete?.id) {
                  console.error("[webhooks/stripe] blue_signups→membership: create athlete failed", athleteErr?.message)
                } else {
                  athleteId = newAthlete.id
                }
              }
              if (athleteId) {
                const startedAt = new Date().toISOString()
                let nextBillingAt: string | null = null
                if (subscriptionId) {
                  try {
                    const sub = await getStripe().subscriptions.retrieve(subscriptionId)
                    if (sub.current_period_end) {
                      nextBillingAt = new Date(sub.current_period_end * 1000).toISOString()
                    }
                  } catch (_) {}
                }
                const { error: membershipErr } = await admin.from("blue_memberships").insert({
                  athlete_id: athleteId,
                  payer_user_id: payerUserId,
                  status: "active",
                  started_at: startedAt,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  source: "invite",
                  created_at: startedAt,
                  updated_at: startedAt,
                  ...(nextBillingAt && { next_billing_at: nextBillingAt }),
                  ...((signupRow as { tshirt_size?: string }).tshirt_size && { tshirt_size: (signupRow as { tshirt_size?: string }).tshirt_size }),
                })
                if (membershipErr) {
                  console.error("[webhooks/stripe] blue_signups→membership: insert failed", membershipErr.message)
                }
              }
            }
          }
        }
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
      if (reg && reg.status !== "paid") {
        const { data: products } = await admin
          .from("products")
          .select("id, name, slug")
          .eq("category", "national_team")
        const bundleProduct = products?.find((p) => (p as { slug?: string }).slug === "nhsca-2026-bundle") ?? products?.[0]
        const orderNumber = generateOrderNumber()
        const orderId = crypto.randomUUID()
        const regCents = Number(reg.reg_fee_cents) || 0
        const apparelCents = Number(reg.apparel_fee_cents) || 0
        const totalCents = regCents + apparelCents
        const customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? reg.parent_email ?? ""
        const customerName = [reg.athlete_first_name, reg.athlete_last_name].filter(Boolean).join(" ") || "National team registrant"
        const { error: orderErr } = await admin.from("orders").insert({
          id: orderId,
          order_number: orderNumber,
          customer_email: customerEmail,
          customer_name: customerName,
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
        })
        if ((orderErr as { code?: string })?.code === "23505") {
          return NextResponse.json({ received: true })
        }
        if (!orderErr && totalCents > 0) {
          await admin.from("order_items").insert({
            order_id: orderId,
            product_id: bundleProduct?.id ?? null,
            product_name: bundleProduct?.name ?? "NHSCA 2026 – Registration + Apparel",
            variant: { color: "N/A", size: "N/A" },
            quantity: 1,
            price: totalCents / 100,
            image_url: null,
          })
          await admin
            .from("national_team_event_registrations")
            .update({
              status: "paid",
              order_id: orderId,
              stripe_session_id: session.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", registrationId)
        }
      }
      return NextResponse.json({ received: true })
    }

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
          variant: { color: "N/A", size: "N/A" },
          quantity: 1,
          price: amountTotal,
          image_url: null,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
