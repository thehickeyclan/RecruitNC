/**
 * WIQ → Stripe migration support.
 *
 * WIQ families' cards live in WrestlingIQ's processor, so we cannot create Stripe
 * subscriptions for them server-side — each family enters a card once through the normal
 * invite → register → checkout flow. What we CAN do is make that checkout bill on their
 * existing schedule: when the registering athlete has an active WIQ subscription, the
 * Checkout Session gets `trial_end` = their WIQ next-due date. Card is collected today,
 * Stripe's first charge lands exactly when WIQ's next one would have, and the WIQ sub is
 * cancelled after checkout — no double billing, no gap in membership.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

/** Checkout requires trial_end ≥ 48h out; give ourselves margin so clock skew can't reject it. */
export const MIN_TRIAL_MS = 50 * 60 * 60 * 1000
/**
 * WIQ bills monthly, so a legitimate next-due is ≤ ~1 month away. Anything further is stale
 * import data, and we'd rather charge today than grant a months-long free ride on bad data.
 */
export const MAX_TRIAL_MS = 45 * 24 * 60 * 60 * 1000

/**
 * When to bill a migrating WIQ family, as a Unix-seconds timestamp for Stripe, or null to
 * bill immediately.
 *
 * - next due within 50h (or past): no trial. They're at/past renewal anyway; the WIQ sub
 *   gets cancelled right after checkout, so "pay Stripe today" IS their renewal.
 * - next due beyond 45 days: no trial (stale mirror data).
 * - otherwise: first Stripe charge on their existing WIQ date.
 */
export function resolveWiqTrialEnd(nextDueAt: string | null | undefined, nowMs: number): number | null {
  if (!nextDueAt) return null
  const due = new Date(nextDueAt).getTime()
  if (!Number.isFinite(due)) return null
  if (due - nowMs < MIN_TRIAL_MS) return null
  if (due - nowMs > MAX_TRIAL_MS) return null
  return Math.floor(due / 1000)
}

export type ActiveWiqSubscription = {
  id: string
  wiq_billing_partner_id: string | null
  next_due_at: string | null
  discount_code: string | null
}

/**
 * The athlete's live WIQ subscription, if any. Matched by athlete_id — the WIQ mirror rows
 * were name-matched to athletes at import time (match_confidence on the row). Only statuses
 * that are actually billing count; a cancelled WIQ sub must not delay a new member's first
 * charge.
 */
export async function findActiveWiqSubscriptionForAthlete(
  admin: SupabaseClient,
  athleteId: string | null | undefined,
): Promise<ActiveWiqSubscription | null> {
  if (!athleteId) return null
  try {
    const { data, error } = await admin
      .from("blue_wiq_subscriptions")
      .select("id, wiq_billing_partner_id, next_due_at, discount_code, status")
      .eq("athlete_id", athleteId)
      .in("status", ["active", "past_due"])
      .order("next_due_at", { ascending: false })
      .limit(1)

    if (error) {
      // Missing table just means WIQ-aware checkout is off — never block a registration.
      if ((error as { code?: string }).code !== "42P01") {
        console.warn("[blue-wiq-migration] lookup failed:", error.message)
      }
      return null
    }
    return (data?.[0] as ActiveWiqSubscription | undefined) ?? null
  } catch (e) {
    console.warn("[blue-wiq-migration] lookup threw:", e instanceof Error ? e.message : e)
    return null
  }
}
