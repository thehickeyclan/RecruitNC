import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { readStripeSecretKey, stripeKeyMissingPayload } from "@/lib/stripe"

export const dynamic = "force-dynamic"

async function signedInUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

/** Current RecruitNC rankings subscription for the signed-in account. */
export async function GET() {
  const user = await signedInUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("recruitnc_subscriptions")
    .select("status, current_period_end, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: "Could not load subscription" }, { status: 500 })
  if (!row) return NextResponse.json({ subscription: null })

  let nextBillingAt = row.current_period_end ?? null
  let cancelAtPeriodEnd = false
  let interval: "month" | "year" | null = null
  const secret = readStripeSecretKey()
  if (secret && row.stripe_subscription_id) {
    try {
      const subscription = await new Stripe(secret).subscriptions.retrieve(row.stripe_subscription_id)
      const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
      if (periodEnd) nextBillingAt = new Date(periodEnd * 1000).toISOString()
      cancelAtPeriodEnd = subscription.cancel_at_period_end === true
      const recurring = subscription.items.data[0]?.price?.recurring?.interval
      interval = recurring === "month" || recurring === "year" ? recurring : null
    } catch (error) {
      console.error("[scouting-report/subscription] Stripe lookup failed", error)
    }
  }

  return NextResponse.json({
    subscription: {
      status: row.status,
      nextBillingAt,
      cancelAtPeriodEnd,
      interval,
      canManage: Boolean(row.stripe_customer_id),
    },
  })
}

/** Open Stripe's secure portal for card updates, invoices, plan changes and cancellation. */
export async function POST(request: NextRequest) {
  const user = await signedInUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from("recruitnc_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: "Could not verify billing access" }, { status: 500 })
  if (!row?.stripe_customer_id) return NextResponse.json({ error: "No manageable subscription found" }, { status: 404 })

  const secret = readStripeSecretKey()
  if (!secret) return NextResponse.json(stripeKeyMissingPayload(), { status: 503 })
  const base = (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "")
  const session = await new Stripe(secret).billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${base}/rankings`,
  })
  return NextResponse.json({ url: session.url })
}
