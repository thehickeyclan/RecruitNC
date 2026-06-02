import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createOrderFromPaymentIntent, createOrderFromSession } from "@/app/actions/stripe"
import { checkoutSessionIsNonStoreImport } from "@/lib/stripe-sync-guards"

export const dynamic = "force-dynamic"

const DAYS_BACK = 60 // Sync last 60 days so we don't miss March 4+ or any gap

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * POST: Sync orders from Stripe into Supabase. Lists PaymentIntents and Checkout
 * Sessions from the last N days; for each that doesn't already have an order,
 * creates one. Ensures no duplicates (checks by stripe_payment_intent_id / stripe_session_id).
 */
export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const stripeSecret = process.env.STRIPE_SECRET_KEY
  if (!stripeSecret?.trim()) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 500 })
  }

  const stripe = new Stripe(stripeSecret)
  const admin = createAdminClient()
  const since = Math.floor((Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000) / 1000)

  let created = 0
  let skipped = 0
  const errors: string[] = []

  // 1) List successful PaymentIntents since `since`
  let hasMorePi = true
  let piStartingAfter: string | undefined
  while (hasMorePi) {
    const list = await stripe.paymentIntents.list({
      created: { gte: since },
      limit: 100,
      ...(piStartingAfter && { starting_after: piStartingAfter }),
    })
    for (const pi of list.data) {
      if (pi.status !== "succeeded") continue
      const { data: existing } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .maybeSingle()
      if (existing) {
        skipped++
        continue
      }
      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
        const linkedSession = sessions.data[0]
        if (linkedSession && checkoutSessionIsNonStoreImport(linkedSession)) {
          skipped++
          continue
        }
        const result = await createOrderFromPaymentIntent(pi.id)
        if (result.success && !result.alreadyExisted) created++
        else if (result.success) skipped++
        else if (result.error) errors.push(`PI ${pi.id}: ${result.error}`)
      } catch (e) {
        errors.push(`PI ${pi.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    hasMorePi = list.has_more
    if (list.data.length) piStartingAfter = list.data[list.data.length - 1].id
    else hasMorePi = false
  }

  // 2) List Checkout Sessions since `since` (sessions may not have a PI we listed, e.g. subscription first payment)
  let hasMoreSession = true
  let sessionStartingAfter: string | undefined
  while (hasMoreSession) {
    const list = await stripe.checkout.sessions.list({
      created: { gte: since },
      limit: 100,
      ...(sessionStartingAfter && { starting_after: sessionStartingAfter }),
    })
    for (const session of list.data) {
      if (session.payment_status !== "paid" && session.status !== "complete") continue
      const { data: existingBySession } = await admin
        .from("orders")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle()
      if (existingBySession) {
        skipped++
        continue
      }
      const piId = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent as { id?: string })?.id
      if (piId) {
        const { data: existingByPi } = await admin.from("orders").select("id").eq("stripe_payment_intent_id", piId).maybeSingle()
        if (existingByPi) {
          skipped++
          continue
        }
      }
      if (checkoutSessionIsNonStoreImport(session)) {
        skipped++
        continue
      }
      try {
        const result = await createOrderFromSession(session.id)
        if (result.success && !result.alreadyExisted) created++
        else if (result.success) skipped++
        else if (result.error) errors.push(`Session ${session.id}: ${result.error}`)
      } catch (e) {
        errors.push(`Session ${session.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    hasMoreSession = list.has_more
    if (list.data.length) sessionStartingAfter = list.data[list.data.length - 1].id
    else hasMoreSession = false
  }

  return NextResponse.json({
    success: true,
    created,
    skipped,
    errors: errors.slice(0, 20),
  })
}
