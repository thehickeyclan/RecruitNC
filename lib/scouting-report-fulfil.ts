/**
 * Turn a paid Stripe session into scouting report access.
 *
 * Split out of the webhook so the decision — what a given session grants — is readable and
 * testable on its own. The webhook file is nine hundred lines of other people's channels.
 *
 * Idempotent by construction: purchases upsert on (user_id, athlete_id) and subscriptions on
 * user_id. Stripe redelivers webhooks, and a redelivery must not create a second row or
 * double-grant anything.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export type ScoutingCheckoutMetadata = {
  source?: string | null
  kind?: string | null
  user_id?: string | null
  athlete_id?: string | null
}

/** Is this session ours? Everything else in the webhook belongs to another channel. */
export function isScoutingReportSession(metadata: ScoutingCheckoutMetadata | null | undefined): boolean {
  return String(metadata?.source ?? "") === "scouting_report"
}

export type FulfilResult =
  | { ok: true; granted: "purchase" | "subscription" }
  | { ok: false; reason: string }

/**
 * Record what was bought.
 *
 * A missing user_id is fatal rather than ignorable: the money arrived and we cannot say whose
 * it is, which is worth an error in the log rather than a silent drop.
 */
export async function fulfilScoutingReportCheckout(
  supabase: SupabaseClient,
  params: {
    metadata: ScoutingCheckoutMetadata
    sessionId: string | null
    amountTotal: number | null
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    currentPeriodEnd: string | null
  },
): Promise<FulfilResult> {
  const userId = String(params.metadata.user_id ?? "").trim()
  if (!userId) return { ok: false, reason: "no user_id in session metadata" }

  const kind = String(params.metadata.kind ?? "single")

  if (kind === "subscription") {
    const { error } = await supabase.from("scouting_report_subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: params.stripeCustomerId,
        stripe_subscription_id: params.stripeSubscriptionId,
        status: "active",
        current_period_end: params.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    if (error) return { ok: false, reason: error.message }
    return { ok: true, granted: "subscription" }
  }

  const athleteId = String(params.metadata.athlete_id ?? "").trim()
  if (!athleteId) return { ok: false, reason: "no athlete_id on a single-report purchase" }

  const { error } = await supabase.from("scouting_report_purchases").upsert(
    {
      user_id: userId,
      athlete_id: athleteId,
      amount_cents: params.amountTotal ?? 0,
      stripe_session_id: params.sessionId,
    },
    { onConflict: "user_id,athlete_id" },
  )
  if (error) return { ok: false, reason: error.message }
  return { ok: true, granted: "purchase" }
}

/**
 * Keep a stored subscription in step with Stripe.
 *
 * Access is refused on anything but active/trialing, so a cancellation or a failed payment
 * has to land here or somebody keeps unlimited reports for free.
 */
export async function syncScoutingSubscriptionStatus(
  supabase: SupabaseClient,
  params: { stripeSubscriptionId: string; status: string; currentPeriodEnd: string | null },
): Promise<boolean> {
  const { error } = await supabase
    .from("scouting_report_subscriptions")
    .update({
      status: params.status,
      current_period_end: params.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", params.stripeSubscriptionId)
  return !error
}
