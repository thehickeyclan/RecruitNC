import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { runResumeDueSubscriptions } from "@/lib/blue-subscription-actions"
import { completeBlueSignupAfterStripePayment } from "@/lib/blue-signup-webhook-complete"
import { nudgeAbandonedBlueSignups } from "@/lib/blue-abandoned-signup-nudge"
import { linkBlueMembershipsByCustomer } from "@/lib/blue-stripe-subscription-status"
import { isBlueStripeSubscription } from "@/lib/blue-stripe-subscription-stats"
import { getStripe, readStripeSecretKey } from "@/lib/stripe"

export const dynamic = "force-dynamic"
export const maxDuration = 120

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

/** Daily: resume paused subs due today + backfill missed Blue checkout sessions (last 7 days) + nudge abandoned checkouts. */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stripeSecret = readStripeSecretKey()
  if (!stripeSecret) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY not set" }, { status: 503 })
  }

  const admin = createAdminClient()
  const stripe = getStripe()
  const resume = await runResumeDueSubscriptions()

  const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)
  let synced = 0
  let skipped = 0
  let failed = 0

  try {
    const list = await stripe.checkout.sessions.list({
      status: "complete",
      created: { gte: since },
      limit: 100,
    })
    const blueSessions = list.data.filter((s) => s.metadata?.signup_id)

    for (const session of blueSessions) {
      const signupId = session.metadata!.signup_id as string
      const { data: signupRow } = await admin.from("blue_signups").select("status").eq("id", signupId).maybeSingle()
      if (signupRow?.status === "paid") {
        skipped++
        continue
      }
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : (session.subscription as { id?: string })?.id ?? null
      const pi =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as { id?: string })?.id ?? null
      const amount = (session.amount_total ?? 5500) / 100
      const email =
        session.customer_email ??
        (session.customer_details as { email?: string })?.email ??
        ""
      const name = (session.customer_details as { name?: string })?.name ?? ""

      const result = await completeBlueSignupAfterStripePayment(admin, () => stripe, {
        signupId,
        customerId,
        subscriptionId,
        checkoutSessionId: session.id,
        paymentIntentId: pi,
        amountTotalDollars: amount,
        customerEmail: email,
        customerName: name,
      })
      if (result.ok) synced++
      else failed++
    }
  } catch (e) {
    console.error("[cron/blue-maintenance] sync:", e)
  }

  // Self-heal memberships that have a Stripe customer but no subscription id — the session
  // backfill above only sees the last 7 days, and the admin sync only 90, so anything that
  // slips both windows would otherwise stay frozen forever.
  let customerLink = { scanned: 0, linked: 0, noSubscription: [] as unknown[], errors: 0 }
  try {
    customerLink = await linkBlueMembershipsByCustomer(stripe, admin, (sub) =>
      isBlueStripeSubscription(sub, process.env.STRIPE_BLUE_PRICE_ID),
    )
  } catch (e) {
    console.error("[cron/blue-maintenance] link-by-customer:", e)
  }

  // Nudge signups that abandoned Stripe Checkout in the last 4h–7d (send-once per signup).
  // Runs AFTER the backfill so a checkout that actually completed but missed its webhook
  // gets marked paid first rather than nudged.
  const nudge = await nudgeAbandonedBlueSignups(admin)

  return NextResponse.json({
    ok: true,
    resume,
    stripeBackfill: { synced, skipped, failed },
    customerLink: {
      scanned: customerLink.scanned,
      linked: customerLink.linked,
      notPaying: customerLink.noSubscription.length,
      errors: customerLink.errors,
    },
    abandonedNudge: nudge,
    ranAt: new Date().toISOString(),
  })
}
