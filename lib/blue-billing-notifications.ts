/**
 * Send-once ledger for parent-facing Blue billing notifications.
 *
 * Claim the key BEFORE sending: a unique-violation means another worker (webhook retry,
 * cron overlap) already owns this notification, so the caller must not send. If the table
 * hasn't been created yet (42P01), we allow the send rather than silently dropping dunning —
 * a duplicate email is cheaper than a parent never learning their card failed. The SQL to
 * create the table is scripts/blue-billing-notifications.sql.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

export const BLUE_BILLING_NOTIFICATIONS_SETUP_HINT =
  "Run scripts/blue-billing-notifications.sql in Supabase SQL Editor to enable send-once dedupe."

export type BlueBillingNotificationKind = "payment_failed" | "abandoned_nudge"

/** One email per failed invoice; Stripe retries the same invoice, parents get one notice. */
export function paymentFailedDedupeKey(invoiceId: string | null, subscriptionId: string, now = new Date()): string {
  if (invoiceId) return `payment_failed:${invoiceId}`
  // No invoice id (rare) — cap at one notice per subscription per month.
  return `payment_failed:${subscriptionId}:${now.toISOString().slice(0, 7)}`
}

export function abandonedNudgeDedupeKey(signupId: string): string {
  return `abandoned_nudge:${signupId}`
}

export async function claimBlueBillingNotification(
  admin: SupabaseClient,
  params: {
    dedupeKey: string
    kind: BlueBillingNotificationKind
    membershipId?: string | null
    signupId?: string | null
    sentTo?: string | null
  },
): Promise<{ claimed: boolean; tableMissing: boolean }> {
  const { error } = await admin.from("blue_billing_notifications").insert({
    dedupe_key: params.dedupeKey,
    kind: params.kind,
    membership_id: params.membershipId ?? null,
    signup_id: params.signupId ?? null,
    sent_to: params.sentTo ?? null,
  })

  if (!error) return { claimed: true, tableMissing: false }

  const code = (error as { code?: string }).code ?? ""
  if (code === "23505") return { claimed: false, tableMissing: false } // already sent
  if (code === "42P01") {
    console.warn("[blue-billing-notifications]", BLUE_BILLING_NOTIFICATIONS_SETUP_HINT)
    return { claimed: true, tableMissing: true } // send anyway; dedupe unavailable
  }

  console.warn("[blue-billing-notifications] claim failed:", error.message)
  // Unknown failure: err on the side of notifying — dunning matters more than dedupe.
  return { claimed: true, tableMissing: false }
}

export async function markBlueBillingNotificationSms(
  admin: SupabaseClient,
  dedupeKey: string,
): Promise<void> {
  const { error } = await admin
    .from("blue_billing_notifications")
    .update({ sms_sent: true })
    .eq("dedupe_key", dedupeKey)
  if (error && (error as { code?: string }).code !== "42P01") {
    console.warn("[blue-billing-notifications] sms mark failed:", error.message)
  }
}
