import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"

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
    const list = await stripe.checkout.sessions.list({
      status: "complete",
      created: { gte: created },
      limit: 100,
    })
    sessions = list.data ?? []
  } catch (e) {
    console.error("[blue/sync-from-stripe] list sessions:", e)
    return NextResponse.json({ error: (e as Error).message, synced: 0, skipped: 0, failed: 0 }, { status: 500 })
  }

  const blueSessions = sessions.filter((s) => s.metadata?.signup_id)
  let synced = 0
  let skipped = 0
  let failed = 0

  for (const session of blueSessions) {
    const signupId = session.metadata!.signup_id as string
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription as { id?: string })?.id ?? null

    const { data: signupRow } = await admin
      .from("blue_signups")
      .select("id, status, stripe_session_id, parent_email, parent_first_name, parent_last_name, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_weight_class, tshirt_size")
      .eq("id", signupId)
      .single()

    if (!signupRow) {
      failed++
      continue
    }

    const alreadyPaid = (signupRow as { status?: string }).status === "paid" && (signupRow as { stripe_session_id?: string }).stripe_session_id
    const { data: existingOrder } = await admin.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle()

    if (alreadyPaid && existingOrder) {
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

    if (subscriptionId) {
      const { data: existingMembership } = await admin
        .from("blue_memberships")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle()
      if (!existingMembership && signupRow) {
        const row = signupRow as {
          parent_email?: string
          parent_first_name?: string
          parent_last_name?: string
          athlete_first_name?: string
          athlete_last_name?: string
          athlete_graduation_year?: number
          athlete_high_school?: string
          athlete_weight_class?: string
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
            }, columns)
            const { data: newAthlete, error: athleteErr } = await admin.from("athletes").insert(athletePayload).select("id").single()
            if (!athleteErr && newAthlete?.id) athleteId = newAthlete.id
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
      const customerEmail = (session as { customer_email?: string }).customer_email ?? (session.customer_details as { email?: string })?.email ?? ""
      const customerName = ((session.customer_details as { name?: string })?.name ?? "").trim() || "Blue member"
      const orderNumber = generateOrderNumber()
      const orderId = crypto.randomUUID()
      const { error: orderErr } = await admin.from("orders").insert({
        id: orderId,
        order_number: orderNumber,
        customer_email: customerEmail || "blue-signup@placeholder.com",
        customer_name: customerName,
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

  return NextResponse.json({
    message: `Sync complete. Blue sessions found: ${blueSessions.length}. Synced: ${synced}, skipped (already in DB): ${skipped}, failed: ${failed}.`,
    synced,
    skipped,
    failed,
    blueSessionsCount: blueSessions.length,
  })
}
