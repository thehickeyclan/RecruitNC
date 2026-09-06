import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { readStripeSecretKey, stripeKeyMissingPayload } from "@/lib/stripe"
import { SCOUTING_REPORT_PRICES, type ScoutingPurchaseKind } from "@/lib/scouting-report-entitlement"
import { loadScoutingEntitlement } from "@/lib/scouting-report-entitlement-db"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * Start checkout for a scouting report — one report, or the unlimited subscription.
 *
 * Refuses to charge somebody who already has access. A parent buying their own child's
 * report, or a coach buying what they get free, is a refund conversation and an email that
 * starts "why did you charge me for" — so the entitlement is checked before a session is
 * created, not only when the report is opened.
 */

export const dynamic = "force-dynamic"

const BASE = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://app.ncwrestlingunited.com"
).replace(/\/$/, "")

export async function POST(request: Request) {
  const secret = readStripeSecretKey()
  if (!secret) return NextResponse.json(stripeKeyMissingPayload(), { status: 500 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in to buy a scouting report." }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    athleteId?: string
    kind?: ScoutingPurchaseKind
  }
  const kind: ScoutingPurchaseKind = body.kind === "subscription" ? "subscription" : "single"
  const athleteId = String(body.athleteId ?? "").trim()
  if (kind === "single" && !athleteId) {
    return NextResponse.json({ error: "Missing athleteId" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin, email")
    .eq("user_id", user.id)
    .maybeSingle()
  const viewer = classifyViewer(profile ?? null)

  // Never charge for something already granted.
  if (athleteId) {
    const entitlement = await loadScoutingEntitlement(admin, {
      userId: user.id,
      email: (profile?.email as string) ?? user.email ?? null,
      athleteId,
      isAdmin: viewer.kind === "admin" || profile?.is_admin === true,
      isCollegeCoach: viewer.isCollegeCoach,
    })
    if (entitlement.canAccess) {
      return NextResponse.json(
        { error: "You already have access to this report.", reason: entitlement.reason },
        { status: 409 },
      )
    }
  }

  let athleteName = ""
  if (athleteId) {
    const { data: athlete } = await admin.from("athletes").select("name").eq("id", athleteId).maybeSingle()
    if (!athlete) return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    athleteName = String(athlete.name ?? "")
  }

  const stripe = new Stripe(secret)
  const returnTo = athleteId ? `/athletes/${encodeURIComponent(athleteId)}/scouting-report` : "/prospects/all"

  try {
    const session = await stripe.checkout.sessions.create({
      mode: kind === "subscription" ? "subscription" : "payment",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: SCOUTING_REPORT_PRICES[kind],
            ...(kind === "subscription" ? { recurring: { interval: "month" as const } } : {}),
            product_data: {
              name:
                kind === "subscription"
                  ? "RecruitNC scouting reports — unlimited"
                  : `Scouting report — ${athleteName || "athlete"}`,
              description:
                kind === "subscription"
                  ? "Unlimited scouting reports while the subscription is active."
                  : "One athlete's scouting report: results, significant wins and losses, competition strength.",
            },
          },
        },
      ],
      // The webhook grants entitlement off this metadata; without it a payment lands with
      // nothing to attach it to.
      metadata: {
        source: "scouting_report",
        kind,
        user_id: user.id,
        athlete_id: athleteId,
      },
      ...(kind === "subscription"
        ? { subscription_data: { metadata: { source: "scouting_report", user_id: user.id } } }
        : {}),
      success_url: `${BASE}${returnTo}?purchased=1`,
      cancel_url: `${BASE}${returnTo}?canceled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error("[scouting-report/checkout]", error)
    return NextResponse.json({ error: "Could not start checkout." }, { status: 500 })
  }
}
