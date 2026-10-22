import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import {
  fulfilScoutingReportCheckout,
  isScoutingReportSession,
  syncScoutingSubscriptionStatus,
} from "@/lib/scouting-report-fulfil"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripeSecretFor } from "@/lib/stripe-accounts"

export const dynamic = "force-dynamic"

/**
 * Guild Ventures' Stripe account: the recruiting memberships (Insider and the Recruiting Command
 * Center), lib/stripe-accounts.ts. NC United's account keeps its own webhook at /api/webhooks/stripe.
 *
 * In Guild Ventures' Stripe dashboard: Developers → Webhooks → add an endpoint at
 * https://www.recruitwrestlers.com/api/webhooks/stripe-guild for checkout.session.completed,
 * customer.subscription.updated and customer.subscription.deleted. Its signing secret goes in
 * GUILD_STRIPE_WEBHOOK_SECRET. Receipts come from Stripe's own customer emails (turn them on in
 * that dashboard); this route sends none.
 */
export async function POST(request: NextRequest) {
  const secrets = String(process.env.GUILD_STRIPE_WEBHOOK_SECRET ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const key = stripeSecretFor("guild")
  if (secrets.length === 0 || !key) {
    console.error("[webhooks/stripe-guild] GUILD_STRIPE_WEBHOOK_SECRET or GUILD_STRIPE_SECRET_KEY not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }
  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })
  const rawBody = await request.text()

  let event: Stripe.Event | null = null
  for (const secret of secrets) {
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, secret)
      break
    } catch {
      continue
    }
  }
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 })

  const admin = createAdminClient()

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    if (!isScoutingReportSession(subscription.metadata)) return NextResponse.json({ received: true, ignored: true })
    const periodEnd = (subscription as { current_period_end?: number }).current_period_end
    await syncScoutingSubscriptionStatus(admin, {
      stripeSubscriptionId: subscription.id,
      status: event.type === "customer.subscription.deleted" ? "canceled" : String(subscription.status ?? ""),
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    return NextResponse.json({ received: true })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    if (!isScoutingReportSession(session.metadata)) return NextResponse.json({ received: true, ignored: true })
    const result = await fulfilScoutingReportCheckout(admin, {
      metadata: session.metadata ?? {},
      sessionId: session.id ?? null,
      amountTotal: session.amount_total ?? null,
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
      currentPeriodEnd: null,
      stripeAccount: "guild",
    })
    if (!result.ok) {
      console.error("[webhooks/stripe-guild] fulfilment failed:", result.reason)
      // A 500 makes Stripe retry; a payment must not be left without its access.
      return NextResponse.json({ error: "Fulfilment failed" }, { status: 500 })
    }
    if (result.replacedSubscriptionId) {
      // An upgrade to the Command Center: stop the plan it replaces, on whichever account bills it.
      const replacedKey = stripeSecretFor(result.replacedAccount ?? "ncu")
      try {
        if (replacedKey) await new Stripe(replacedKey).subscriptions.cancel(result.replacedSubscriptionId)
      } catch (cancelErr) {
        console.error("[webhooks/stripe-guild] could not cancel the replaced subscription:", result.replacedSubscriptionId, cancelErr)
      }
    }
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true, ignored: true })
}
