import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { athleteEnrichmentFromSignup } from "@/lib/blue-signup-enrich-athlete"
import { orderShippingFields } from "@/lib/order-shipping"
import { syntheticOrderItemSku } from "@/lib/order-item-sku"
import { reconcileBlueMembershipsFromStripe } from "@/lib/blue-stripe-subscription-status"

export const dynamic = "force-dynamic"

const stripeSecret = process.env.STRIPE_SECRET_KEY

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

/**
 * POST: Sync Blue from Stripe.
 * Lists completed Checkout Sessions (last 90 days) with metadata.signup_id.
 * For each session where blue_signups is not paid or store order is missing,
 * backfills: update blue_signups, ensure blue_memberships, create store order.
 * Use this to pull in Blue payments that didn't run through the webhook (e.g. two orders in Stripe not in store/cockpit/reports).
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!stripeSecret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 503 })
  }

  const stripe = getStripe()
  const admin = createAdminClient()
  const created = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)

  let sessions: Stripe.Checkout.Session[] = []
  try {
    let hasMore = true
    let startingAfter: string | undefined
    while (hasMore) {
      const list = await stripe.checkout.sessions.list({
        status: "complete",
        created: { gte: created },
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      })
      const chunk = list.data ?? []
      sessions = sessions.concat(chunk)
      // High-volume stores can exceed 500 sessions in 90 days; keep paging so Blue checkouts aren’t missed.
      hasMore = chunk.length === 100 && sessions.length < 5000
      if (chunk.length) startingAfter = chunk[chunk.length - 1].id
      else hasMore = false
    }
  } catch (e) {
    console.error("[blue/sync-from-stripe] list sessions:", e)
    return NextResponse.json({ error: (e as Error).message, synced: 0, skipped: 0, failed: 0 }, { status: 500 })
  }

  // 1) Sessions with metadata.signup_id (normal Blue flow)
  const blueSessions = sessions.filter((s) => s.metadata?.signup_id)
  // 2) Sessions that look like Blue subscription but have no signup_id (webhook missed or metadata lost) — match by email
  const customerEmail = (s: Stripe.Checkout.Session) =>
    ((s as { customer_email?: string }).customer_email ?? (s.customer_details as { email?: string })?.email ?? "").trim().toLowerCase()
  const sessionsWithoutSignupId = sessions.filter(
    (s) => !s.metadata?.signup_id && s.subscription && customerEmail(s)
  )
  let synced = 0
  let skipped = 0
  let failed = 0

  for (const session of blueSessions) {
    const signupId = session.metadata!.signup_id as string
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as { id?: string })?.id ?? null

    const { data: signupRow } = await admin
      .from("blue_signups")
      .select("id, status, stripe_session_id, parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, athlete_wrestling_club, highest_achievement, tshirt_size")
      .eq("id", signupId)
      .single()

    if (!signupRow) {
      failed++
      continue
    }

    const alreadyPaid = (signupRow as { status?: string }).status === "paid" && (signupRow as { stripe_session_id?: string }).stripe_session_id
    const { data: existingOrder } = await admin.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle()
    const { data: existingMembership } = subscriptionId
      ? await admin.from("blue_memberships").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle()
      : { data: null }

    // Skip only when signup is paid, order exists, and membership exists (nothing to backfill)
    if (alreadyPaid && existingOrder && existingMembership) {
      skipped++
      continue
    }

    let didSync = false
    if (!alreadyPaid) {
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
        console.error("[blue/sync-from-stripe] update blue_signups:", signupUpdateErr.message)
        failed++
        continue
      }
      didSync = true
    }

    if (subscriptionId && !existingMembership && signupRow) {
        const row = signupRow as {
          parent_email?: string
          parent_first_name?: string
          parent_last_name?: string
          athlete_first_name?: string
          athlete_last_name?: string
          athlete_graduation_year?: number
          athlete_high_school?: string
          athlete_weight_class?: string
          athlete_cell_phone?: string
          athlete_email?: string
          athlete_gpa?: string
          athlete_wrestling_club?: string
          highest_achievement?: string
          tshirt_size?: string
        }
        const parentEmail = (row.parent_email ?? "").trim().toLowerCase()
        const gradYear = Number(row.athlete_graduation_year)
        const athleteName = [row.athlete_first_name, row.athlete_last_name].filter(Boolean).join(" ").trim()
        const highSchool = (row.athlete_high_school ?? "").trim()
        let payerUserId: string | null = null
        const { data: profileRow } = await admin.from("user_profiles").select("user_id").ilike("email", parentEmail).limit(1).maybeSingle()
        if (profileRow?.user_id) {
          payerUserId = profileRow.user_id as string
        } else if (parentEmail) {
          const randomPassword = "blue-sync-" + crypto.randomUUID().slice(0, 8)
          const { data: newUser, error: createUserErr } = await admin.auth.admin.createUser({
            email: parentEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              full_name: [row.parent_first_name, row.parent_last_name].filter(Boolean).join(" ").trim(),
              first_name: (row.parent_first_name ?? "").trim(),
              last_name: (row.parent_last_name ?? "").trim(),
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
          const enrichment = athleteEnrichmentFromSignup(row)
          const existingAthlete = await findExistingAthlete(admin, { name: athleteName, graduationYear: gradYear, school: highSchool })
          let athleteId: string | undefined = existingAthlete?.id
          if (!athleteId) {
            const columns = await getAthletesColumnNames(admin)
            const athletePayload = filterPayloadToSchema({
              name: athleteName,
              firstName: (row.athlete_first_name ?? "").trim(),
              lastName: (row.athlete_last_name ?? "").trim(),
              graduationyear: gradYear,
              highschool: highSchool,
              weightclass: (row.athlete_weight_class ?? "").trim() || null,
              ncUnitedTeam: "blue",
              recruiting_status: "Uncommitted",
              is_prospect: true,
              profile_verified: false,
              updated_at: new Date().toISOString(),
              ...enrichment,
            }, columns)
            const { data: newAthlete, error: athleteErr } = await admin.from("athletes").insert(athletePayload).select("id").single()
            if (!athleteErr && newAthlete?.id) athleteId = newAthlete.id
          } else {
            const columns = await getAthletesColumnNames(admin)
            const updatePayload = filterPayloadToSchema({ ...enrichment, ncUnitedTeam: "blue", updated_at: new Date().toISOString() }, columns)
            if (Object.keys(updatePayload).length > 1) {
              await admin.from("athletes").update(updatePayload).eq("id", athleteId)
            }
          }
          if (athleteId) {
            let nextBillingAt: string | null = null
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId)
              if (sub.current_period_end) nextBillingAt = new Date(sub.current_period_end * 1000).toISOString()
            } catch (_) {}
            const startedAt = new Date().toISOString()
            await admin.from("blue_memberships").insert({
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
              ...(row.tshirt_size && { tshirt_size: row.tshirt_size }),
            })
          }
        }
    }

    if (!existingOrder) {
      let piForOrder: string | null = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id ?? null
      if (!piForOrder && subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] })
          const inv = (sub as { latest_invoice?: Stripe.Invoice | string }).latest_invoice
          if (inv && typeof inv === "object" && inv.payment_intent) {
            piForOrder = typeof inv.payment_intent === "string" ? inv.payment_intent : (inv.payment_intent as { id?: string })?.id ?? null
          }
        } catch (_) {}
      }
      const amountTotal = ((session as { amount_total?: number }).amount_total ?? 0) / 100
      const customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? ""
      const customerName = ((session.customer_details as { name?: string })?.name ?? "").trim() || "Blue member"
      const orderNumber = generateOrderNumber()
      const orderId = crypto.randomUUID()
      const orderEmail = customerEmail || "blue-signup@placeholder.com"
      const { error: orderErr } = await admin.from("orders").insert({
        id: orderId,
        order_number: orderNumber,
        customer_email: orderEmail,
        email: orderEmail,
        customer_name: customerName,
        ...orderShippingFields(customerName, {}),
        shipping_address: {},
        shipping_method: { name: "Blue membership", price: 0 },
        subtotal: amountTotal,
        shipping_cost: 0,
        tax: 0,
        discount: 0,
        total: amountTotal,
        status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: piForOrder,
        promo_code: null,
      })
      if (!orderErr) {
        await admin.from("order_items").insert({
          order_id: orderId,
          product_id: null,
          product_name: "NC United Blue – Monthly",
          sku: syntheticOrderItemSku({
            productId: null,
            label: "NC United Blue – Monthly",
            dedupeKey: piForOrder ?? session.id,
          }),
          variant: { color: "N/A", size: "N/A" },
          quantity: 1,
          price: amountTotal,
          image_url: null,
        })
        didSync = true
      } else if ((orderErr as { code?: string }).code !== "23505") {
        failed++
      }
    }
    if (didSync) synced++
  }

  // Email fallback: sessions with no signup_id (webhook missed or metadata lost) — match by customer email to a signup (pending or paid)
  const signupSelect = "id, status, stripe_session_id, parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, athlete_wrestling_club, highest_achievement, tshirt_size"
  for (const session of sessionsWithoutSignupId) {
    const email = customerEmail(session)
    if (!email) continue
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as { id?: string })?.id ?? null
    if (subscriptionId) {
      const { data: existingMembership } = await admin.from("blue_memberships").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle()
      if (existingMembership) continue // already in cockpit
    }
    const { data: signupList } = await admin
      .from("blue_signups")
      .select(signupSelect)
      .ilike("parent_email", email)
      .order("created_at", { ascending: false })
      .limit(5)
    if (!signupList?.length) continue
    // Prefer pending signup; otherwise use most recent (e.g. paid but membership missing)
    const signupRow = (signupList.find((s) => (s as { status?: string }).status !== "paid") ?? signupList[0]) as {
      id: string
      status?: string
      stripe_session_id?: string
      parent_email?: string
      parent_first_name?: string
      parent_last_name?: string
      athlete_first_name?: string
      athlete_last_name?: string
      athlete_graduation_year?: number
      athlete_high_school?: string
      athlete_weight_class?: string
      athlete_cell_phone?: string
      athlete_email?: string
      athlete_gpa?: string
      athlete_wrestling_club?: string
      highest_achievement?: string
      tshirt_size?: string
    }
    const signupId = signupRow.id
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
    const alreadyPaid = signupRow.status === "paid" && signupRow.stripe_session_id
    const { data: existingOrder } = await admin.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle()
    // Don't skip: we may need to backfill membership even when signup is already paid (we already continued above if membership exists)
    let didSync = false
    if (!alreadyPaid) {
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
        console.error("[blue/sync-from-stripe] email fallback update blue_signups:", signupUpdateErr.message)
        failed++
        continue
      }
      didSync = true
    }
    if (subscriptionId) {
      const { data: existingMembership } = await admin.from("blue_memberships").select("id").eq("stripe_subscription_id", subscriptionId).maybeSingle()
      if (!existingMembership && signupRow) {
        const row = signupRow
        const parentEmail = (row.parent_email ?? "").trim().toLowerCase()
        const gradYear = Number(row.athlete_graduation_year)
        const athleteName = [row.athlete_first_name, row.athlete_last_name].filter(Boolean).join(" ").trim()
        const highSchool = (row.athlete_high_school ?? "").trim()
        let payerUserId: string | null = null
        const { data: profileRow } = await admin.from("user_profiles").select("user_id").ilike("email", parentEmail).limit(1).maybeSingle()
        if (profileRow?.user_id) payerUserId = profileRow.user_id as string
        else if (parentEmail) {
          const randomPassword = "blue-sync-" + crypto.randomUUID().slice(0, 8)
          const { data: newUser, error: createUserErr } = await admin.auth.admin.createUser({
            email: parentEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              full_name: [row.parent_first_name, row.parent_last_name].filter(Boolean).join(" ").trim(),
              first_name: (row.parent_first_name ?? "").trim(),
              last_name: (row.parent_last_name ?? "").trim(),
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
          const enrichment = athleteEnrichmentFromSignup(row)
          const existingAthlete = await findExistingAthlete(admin, { name: athleteName, graduationYear: gradYear, school: highSchool })
          let athleteId: string | undefined = existingAthlete?.id
          if (!athleteId) {
            const columns = await getAthletesColumnNames(admin)
            const athletePayload = filterPayloadToSchema({
              name: athleteName,
              firstName: (row.athlete_first_name ?? "").trim(),
              lastName: (row.athlete_last_name ?? "").trim(),
              graduationyear: gradYear,
              highschool: highSchool,
              weightclass: (row.athlete_weight_class ?? "").trim() || null,
              ncUnitedTeam: "blue",
              recruiting_status: "Uncommitted",
              is_prospect: true,
              profile_verified: false,
              updated_at: new Date().toISOString(),
              ...enrichment,
            }, columns)
            const { data: newAthlete, error: athleteErr } = await admin.from("athletes").insert(athletePayload).select("id").single()
            if (!athleteErr && newAthlete?.id) athleteId = newAthlete.id
          } else {
            const columns = await getAthletesColumnNames(admin)
            const updatePayload = filterPayloadToSchema({ ...enrichment, ncUnitedTeam: "blue", updated_at: new Date().toISOString() }, columns)
            if (Object.keys(updatePayload).length > 1) {
              await admin.from("athletes").update(updatePayload).eq("id", athleteId)
            }
          }
          if (athleteId) {
            let nextBillingAt: string | null = null
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId)
              if (sub.current_period_end) nextBillingAt = new Date(sub.current_period_end * 1000).toISOString()
            } catch (_) {}
            const startedAt = new Date().toISOString()
            await admin.from("blue_memberships").insert({
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
              ...(row.tshirt_size && { tshirt_size: row.tshirt_size }),
            })
          }
        }
      }
    }
    if (!existingOrder) {
      let piForOrder: string | null = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id ?? null
      if (!piForOrder && subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["latest_invoice"] })
          const inv = (sub as { latest_invoice?: Stripe.Invoice | string }).latest_invoice
          if (inv && typeof inv === "object" && inv.payment_intent) {
            piForOrder = typeof inv.payment_intent === "string" ? inv.payment_intent : (inv.payment_intent as { id?: string })?.id ?? null
          }
        } catch (_) {}
      }
      const amountTotal = ((session as { amount_total?: number }).amount_total ?? 0) / 100
      const sessionCustomerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? ""
      const customerName = ((session.customer_details as { name?: string })?.name ?? "").trim() || "Blue member"
      const orderNumber = generateOrderNumber()
      const orderId = crypto.randomUUID()
      const orderEmail = sessionCustomerEmail || "blue-signup@placeholder.com"
      const { error: orderErr } = await admin.from("orders").insert({
        id: orderId,
        order_number: orderNumber,
        customer_email: orderEmail,
        email: orderEmail,
        customer_name: customerName,
        ...orderShippingFields(customerName, {}),
        shipping_address: {},
        shipping_method: { name: "Blue membership", price: 0 },
        subtotal: amountTotal,
        shipping_cost: 0,
        tax: 0,
        discount: 0,
        total: amountTotal,
        status: "paid",
        stripe_session_id: session.id,
        stripe_payment_intent_id: piForOrder,
        promo_code: null,
      })
      if (!orderErr) {
        await admin.from("order_items").insert({
          order_id: orderId,
          product_id: null,
          product_name: "NC United Blue – Monthly",
          sku: syntheticOrderItemSku({
            productId: null,
            label: "NC United Blue – Monthly",
            dedupeKey: piForOrder ?? session.id,
          }),
          variant: { color: "N/A", size: "N/A" },
          quantity: 1,
          price: amountTotal,
          image_url: null,
        })
        didSync = true
      } else if ((orderErr as { code?: string }).code !== "23505") failed++
    }
    if (didSync) synced++
  }

  const { updated: statusReconciled, errors: statusErrors } = await reconcileBlueMembershipsFromStripe(stripe, admin)

  return NextResponse.json({
    message: `Sync complete. With signup_id: ${blueSessions.length}. By email fallback: ${sessionsWithoutSignupId.length} sessions considered. Synced: ${synced}, skipped: ${skipped}, failed: ${failed}. Membership status reconciled: ${statusReconciled} updated${statusErrors ? `, ${statusErrors} errors` : ""}.`,
    synced,
    skipped,
    failed,
    statusReconciled,
    blueSessionsCount: blueSessions.length,
  })
}
