import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { stripeKeyMissingPayload } from "@/lib/stripe"
import { accountOfRow, stripeSecretFor, type StripeAccount } from "@/lib/stripe-accounts"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"

export const dynamic = "force-dynamic"

async function signedInUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

type SubscriptionRow = {
  status?: string | null
  current_period_end?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_account?: string | null
}

/** The row, with stripe_account when the column exists (a missing column fails the whole select). */
async function loadRow(userId: string): Promise<{ row: SubscriptionRow | null; error: boolean }> {
  const admin = createAdminClient()
  const cols = "status, current_period_end, stripe_customer_id, stripe_subscription_id"
  const first = await admin.from("recruitnc_subscriptions").select(`${cols}, stripe_account`).eq("user_id", userId).maybeSingle()
  if (!first.error) return { row: (first.data as SubscriptionRow | null) ?? null, error: false }
  const second = await admin.from("recruitnc_subscriptions").select(cols).eq("user_id", userId).maybeSingle()
  return { row: (second.data as SubscriptionRow | null) ?? null, error: Boolean(second.error) }
}

/**
 * Run a Stripe call on the account that bills this row; if that account does not know the id
 * (a Guild Ventures subscription recorded before stripe_account existed), try the other one.
 */
async function onBillingAccount<T>(row: SubscriptionRow, call: (stripe: Stripe) => Promise<T>): Promise<T | null> {
  const first = accountOfRow(row)
  const order: StripeAccount[] = row.stripe_account ? [first] : [first, first === "ncu" ? "guild" : "ncu"]
  let lastError: unknown = null
  for (const account of order) {
    const secret = stripeSecretFor(account)
    if (!secret) continue
    try {
      return await call(new Stripe(secret))
    } catch (error) {
      lastError = error
    }
  }
  if (lastError) console.error("[scouting-report/subscription] Stripe call failed", lastError)
  return null
}

/** Current rankings / Command Center subscription for the signed-in account. */
export async function GET() {
  const user = await signedInUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { row, error } = await loadRow(user.id)
  if (error) return NextResponse.json({ error: "Could not load subscription" }, { status: 500 })
  if (!row) return NextResponse.json({ subscription: null })

  let nextBillingAt = row.current_period_end ?? null
  let cancelAtPeriodEnd = false
  let interval: "month" | "year" | null = null
  if (row.stripe_subscription_id) {
    const subscription = await onBillingAccount(row, (stripe) => stripe.subscriptions.retrieve(String(row.stripe_subscription_id)))
    if (subscription) {
      const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end
      if (periodEnd) nextBillingAt = new Date(periodEnd * 1000).toISOString()
      cancelAtPeriodEnd = subscription.cancel_at_period_end === true
      const recurring = subscription.items.data[0]?.price?.recurring?.interval
      interval = recurring === "month" || recurring === "year" ? recurring : null
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

  const { row, error } = await loadRow(user.id)
  if (error) return NextResponse.json({ error: "Could not verify billing access" }, { status: 500 })
  if (!row?.stripe_customer_id) return NextResponse.json({ error: "No manageable subscription found" }, { status: 404 })
  if (!stripeSecretFor(accountOfRow(row))) return NextResponse.json(stripeKeyMissingPayload(), { status: 503 })

  // /rankings is NC United's page; on recruitwrestlers.com the account page is home.
  const onRw = stagedBrandForHost(request.headers.get("host")) === "national"
  const back = onRw ? "https://www.recruitwrestlers.com/profile" : `${(process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/$/, "")}/rankings`
  const session = await onBillingAccount(row, (stripe) =>
    stripe.billingPortal.sessions.create({ customer: String(row.stripe_customer_id), return_url: back }),
  )
  if (!session) return NextResponse.json({ error: "Could not open billing" }, { status: 502 })
  return NextResponse.json({ url: session.url })
}
