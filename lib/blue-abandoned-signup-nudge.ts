/**
 * Abandoned-checkout recovery for NC United Blue.
 *
 * 25 of the first 63 signups (40%) filled the registration form and never completed Stripe
 * Checkout — and nothing followed up. This nudges each abandoned signup exactly once, by
 * email, linking straight back to the prefilled register page (invites stay valid until
 * payment completes, so the resume link works).
 *
 * The window is deliberate:
 *  - not before 4h: they may still be mid-checkout, and Stripe sessions live 24h anyway
 *  - not after 7d: a weeks-old nudge out of nowhere reads as spam, and this went live with
 *    a backlog of stale abandons (21 of 25 were >90 days old) that should NOT get blasted.
 *    Stale ones stay visible to admins in the signups list for manual outreach.
 *
 * Runs from the daily blue-maintenance cron; the send-once ledger makes overlap safe.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { sendBlueFinishRegistrationEmail } from "@/lib/email"
import { abandonedNudgeDedupeKey, claimBlueBillingNotification } from "@/lib/blue-billing-notifications"

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"

export const NUDGE_MIN_AGE_MS = 4 * 60 * 60 * 1000
export const NUDGE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type NudgeableSignup = {
  status: string | null
  created_at: string | null
}

/** Pure, so the window rules are testable without a database. */
export function isSignupNudgeEligible(signup: NudgeableSignup, now: number): boolean {
  if (signup.status !== "pending_payment") return false
  if (!signup.created_at) return false
  const created = new Date(signup.created_at).getTime()
  if (!Number.isFinite(created)) return false
  const age = now - created
  return age >= NUDGE_MIN_AGE_MS && age <= NUDGE_MAX_AGE_MS
}

export type NudgeRunResult = {
  eligible: number
  sent: number
  skippedAlreadySent: number
  skippedNoEmail: number
}

export async function nudgeAbandonedBlueSignups(
  admin: SupabaseClient,
  now: number = Date.now(),
): Promise<NudgeRunResult> {
  const result: NudgeRunResult = { eligible: 0, sent: 0, skippedAlreadySent: 0, skippedNoEmail: 0 }

  try {
    const oldest = new Date(now - NUDGE_MAX_AGE_MS).toISOString()
    const { data, error } = await admin
      .from("blue_signups")
      .select("id, status, created_at, parent_email, parent_first_name, athlete_first_name, athlete_last_name, invite_id")
      .eq("status", "pending_payment")
      .gte("created_at", oldest)
      .order("created_at", { ascending: true })
      .limit(50)

    if (error || !Array.isArray(data)) {
      if (error) console.error("[blue-nudge] query failed:", error.message)
      return result
    }

    for (const signup of data) {
      if (!isSignupNudgeEligible(signup, now)) continue
      result.eligible++

      const email = signup.parent_email?.trim()
      if (!email) {
        result.skippedNoEmail++
        continue
      }

      const claim = await claimBlueBillingNotification(admin, {
        dedupeKey: abandonedNudgeDedupeKey(signup.id),
        kind: "abandoned_nudge",
        signupId: signup.id,
        sentTo: email,
      })
      if (!claim.claimed) {
        result.skippedAlreadySent++
        continue
      }

      // Invites are only marked used after payment completes, so an abandoned signup's
      // invite still opens the prefilled register page — unless it has since expired.
      let resumeUrl: string | null = null
      if (signup.invite_id) {
        const { data: invite } = await admin
          .from("blue_invites")
          .select("token, used_at, expires_at")
          .eq("id", signup.invite_id)
          .maybeSingle()
        if (invite?.token && !invite.used_at && new Date(invite.expires_at).getTime() > now) {
          resumeUrl = `${SITE_URL}/blue/register?invite=${encodeURIComponent(invite.token)}`
        }
      }

      const sent = await sendBlueFinishRegistrationEmail({
        to: email,
        parentName: signup.parent_first_name?.trim() || "",
        athleteName: [signup.athlete_first_name, signup.athlete_last_name].filter(Boolean).join(" ").trim(),
        resumeUrl,
      })
      if (sent.success) result.sent++
    }

    return result
  } catch (e) {
    console.error("[blue-nudge]", e instanceof Error ? e.message : e)
    return result
  }
}
