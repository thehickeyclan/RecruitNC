import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createOrderFromPaymentIntent, createOrderFromSession } from "@/app/actions/stripe"
import { checkoutSessionIsNonStoreImport } from "@/lib/stripe-sync-guards"
import { syncPaidSubscriptionInvoicesFromStripe } from "@/lib/orders/ensure-order-from-stripe-invoice"
import { getStripe, readStripeConfigStatus, readStripeSecretKey, stripeKeyMissingPayload } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const DAYS_BACK = 60
/** Invoice backfill window — renewals only; avoids flooding with every historical signup. */
const INVOICE_DAYS_BACK = 14
/** Stop checkout/PI loops before Vercel kills the function; invoices run first. */
const SYNC_TIME_BUDGET_MS = 45_000

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * GET: Admin diagnostic — is Stripe secret visible to this serverless function?
 */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  return NextResponse.json(readStripeConfigStatus())
}

/**
 * POST: Sync orders from Stripe into Supabase. Lists PaymentIntents and Checkout
 * Sessions from the last N days; for each that doesn't already have an order,
 * creates one. Ensures no duplicates (checks by stripe_payment_intent_id / stripe_session_id).
 */
export async function POST() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const stripeSecret = readStripeSecretKey()
    if (!stripeSecret) {
      return NextResponse.json(stripeKeyMissingPayload(), { status: 503 })
    }

    const stripe = getStripe()
    const admin = createAdminClient()
    const since = Math.floor((Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000) / 1000)
    const deadline = Date.now() + SYNC_TIME_BUDGET_MS

    let created = 0
    let skipped = 0
    const errors: string[] = []
    let partial = false

    // 1) Paid subscription invoices first (Blue renewals) — usually what admins need
    let invoicesCreated = 0
    let invoicesSkipped = 0
    const invoiceErrors: string[] = []
    const invoiceSince = Math.floor((Date.now() - INVOICE_DAYS_BACK * 24 * 60 * 60 * 1000) / 1000)
    try {
      const invoiceSync = await syncPaidSubscriptionInvoicesFromStripe(admin, stripe, {
        sinceUnix: invoiceSince,
        renewalsOnly: true,
      })
      invoicesCreated = invoiceSync.created
      invoicesSkipped = invoiceSync.skipped
      invoiceErrors.push(...invoiceSync.errors)
    } catch (e) {
      invoiceErrors.push(e instanceof Error ? e.message : String(e))
    }

    // 2) Successful PaymentIntents since `since`
    let hasMorePi = true
    let piStartingAfter: string | undefined
    while (hasMorePi && Date.now() < deadline) {
      const list = await stripe.paymentIntents.list({
        created: { gte: since },
        limit: 100,
        ...(piStartingAfter && { starting_after: piStartingAfter }),
      })
      for (const pi of list.data) {
        if (Date.now() >= deadline) {
          partial = true
          break
        }
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
      if (partial) break
      hasMorePi = list.has_more
      if (list.data.length) piStartingAfter = list.data[list.data.length - 1].id
      else hasMorePi = false
    }
    if (hasMorePi && Date.now() >= deadline) partial = true

    // 3) Checkout Sessions since `since`
    let hasMoreSession = true
    let sessionStartingAfter: string | undefined
    while (hasMoreSession && Date.now() < deadline) {
      const list = await stripe.checkout.sessions.list({
        created: { gte: since },
        limit: 100,
        ...(sessionStartingAfter && { starting_after: sessionStartingAfter }),
      })
      for (const session of list.data) {
        if (Date.now() >= deadline) {
          partial = true
          break
        }
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
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as { id?: string })?.id
        if (piId) {
          const { data: existingByPi } = await admin
            .from("orders")
            .select("id")
            .eq("stripe_payment_intent_id", piId)
            .maybeSingle()
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
      if (partial) break
      hasMoreSession = list.has_more
      if (list.data.length) sessionStartingAfter = list.data[list.data.length - 1].id
      else hasMoreSession = false
    }
    if (hasMoreSession && Date.now() >= deadline) partial = true

    const totalCreated = created + invoicesCreated
    const totalSkipped = skipped + invoicesSkipped

    return NextResponse.json({
      success: true,
      created: totalCreated,
      skipped: totalSkipped,
      createdFromCheckout: created,
      createdFromInvoices: invoicesCreated,
      partial,
      errors: [...errors, ...invoiceErrors].slice(0, 20),
    })
  } catch (e) {
    console.error("[admin/orders/sync-stripe]", e)
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Sync from Stripe failed",
      },
      { status: 500 },
    )
  }
}
