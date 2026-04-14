import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getBlueMembershipStripeDetails } from "@/lib/blue-membership-stripe-details"

export const dynamic = "force-dynamic"

type BlueMembershipForParent = {
  id: string
  athleteId: string
  athleteName: string
  status: string
  startedAt: string
  endedAt: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  resumeAt: string | null
  /** From DB (webhook sync); may match Stripe current_period_end when enriched */
  nextBillingAt: string | null
  /** Stripe-only when subscription exists */
  lastPaymentAt: string | null
  amountFormatted: string | null
  cancelAtPeriodEnd: boolean
  cardBrand: string | null
  cardLast4: string | null
  stripeDetailsError: string | null
  planName: string | null
  source: "live" | "cached" | "unavailable"
}

/** GET: List Blue memberships where the current user is the payer — with billing details when Stripe is available. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("blue_memberships")
    .select(
      "id, athlete_id, status, started_at, ended_at, stripe_customer_id, stripe_subscription_id, resume_at, next_billing_at"
    )
    .eq("payer_user_id", user.id)
    .order("started_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ memberships: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!rows?.length) {
    return NextResponse.json({ memberships: [] })
  }

  const athleteIds = [...new Set(rows.map((r) => r.athlete_id))]
  const { data: athletes } = await admin
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName")
    .in("id", athleteIds)

  const nameById: Record<string, string> = {}
  for (const a of athletes ?? []) {
    const row = a as Record<string, unknown>
    const id = String(row.id ?? "")
    const name =
      String(row.name ?? "").trim() ||
      [row.firstname ?? row.firstName, row.lastname ?? row.lastName].filter(Boolean).join(" ").trim()
    nameById[id] = name || "Athlete"
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const memberships: BlueMembershipForParent[] = []

  for (const r of rows) {
    const stripeSubId = (r as { stripe_subscription_id?: string | null }).stripe_subscription_id ?? null
    const dbNext = (r as { next_billing_at?: string | null }).next_billing_at ?? null

    let lastPaymentAt: string | null = null
    let amountFormatted: string | null = null
    let cancelAtPeriodEnd = false
    let cardBrand: string | null = null
    let cardLast4: string | null = null
    let nextBillingAt: string | null = dbNext
    let stripeDetailsError: string | null = null
    let planName: string | null = null
    let source: "live" | "cached" | "unavailable" = dbNext ? "cached" : "unavailable"

    if (stripeSubId && stripeKey) {
      const enriched = await getBlueMembershipStripeDetails(stripeSubId)
      if (enriched.ok) {
        const d = enriched.details
        lastPaymentAt = d.lastPaymentAt
        amountFormatted = d.amountFormatted
        cancelAtPeriodEnd = d.cancelAtPeriodEnd
        cardBrand = d.cardBrand
        cardLast4 = d.cardLast4
        if (d.nextBillingAt) nextBillingAt = d.nextBillingAt
        planName = d.planName ?? null
        source = "live"
      } else {
        stripeDetailsError = enriched.error
      }
    }

    memberships.push({
      id: r.id,
      athleteId: r.athlete_id,
      athleteName: nameById[r.athlete_id] ?? "—",
      status: r.status,
      startedAt: r.started_at,
      endedAt: (r as { ended_at?: string | null }).ended_at ?? null,
      stripeCustomerId: r.stripe_customer_id ?? null,
      stripeSubscriptionId: stripeSubId,
      resumeAt: (r as { resume_at?: string | null }).resume_at ?? null,
      nextBillingAt,
      lastPaymentAt,
      amountFormatted,
      cancelAtPeriodEnd,
      cardBrand,
      cardLast4,
      stripeDetailsError,
      planName,
      source,
    })
  }

  return NextResponse.json({ memberships })
}
