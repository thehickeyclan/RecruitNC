import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isEntitled } from "@/lib/blue-membership"
import { collegeForCoach } from "@/lib/college-domain-schools"
import { isApprovedCoach } from "@/lib/coach-messages"
import { sendToTokens } from "@/lib/push-send"

/**
 * "Washington and Jefferson College viewed Liam's profile" - an iPhone alert to the wrestler's
 * own family when a college program opens their profile.
 *
 * The same rules as the "who viewed" panel on the profile (lib/coach-profile-views.ts):
 *
 * - **The program is named, never the coach.** A school showing interest reads very differently
 *   from a named adult watching a minor.
 * - **Reviewed college coaches only.** Anyone can pick "College coach" at sign-up, and sign-up
 *   sets verified_coach before staff look; until Matt confirms them (verification_status
 *   'approved'), a parent or fan could otherwise trigger alerts to other people's children.
 * - **Blue members only.** It is a benefit of NC United Blue, which belongs to the wrestler: the
 *   alert goes out only when the wrestler holds a current membership (Stripe or WrestlingIQ,
 *   paid or scholarship, not graduated) - the same `isEntitled` every other Blue feature uses.
 * - **Once per program per wrestler per week.** A coach clicking around a profile, or coming back
 *   to it, is one piece of news, not five.
 *
 * Only phones that are signed in to the wrestler's account or a linked parent's account receive
 * it - `push_devices.user_id`, set when the app registers while signed in. Never throws: an alert
 * that fails must not fail the page view that caused it.
 */

function weekStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) // Monday
  return d.toISOString().slice(0, 10)
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

export async function alertFamilyOfProgramView(
  admin: SupabaseClient,
  input: { athleteId: string; viewerUserId: string },
): Promise<{ sent: number; skipped?: string }> {
  try {
    const { data: viewer } = await admin
      .from("user_profiles")
      .select("role, verified_coach, verification_status, institution, email")
      .eq("user_id", input.viewerUserId)
      .maybeSingle()
    // Reviewed by staff, not just let in: access-first sign-up sets verified_coach before review.
    if (!viewer || !isApprovedCoach(viewer)) return { sent: 0, skipped: "not a reviewed college coach" }

    const program = collegeForCoach({ institution: viewer.institution as string | null, email: viewer.email as string | null })
    if (!program) return { sent: 0, skipped: "no program" }

    const { data: athlete } = await admin
      .from("athletes")
      .select("id, name, claimed_by_user_id, graduationyear")
      .eq("id", input.athleteId)
      .maybeSingle()
    if (!athlete) return { sent: 0, skipped: "no athlete" }

    const [{ data: stripe }, { data: wiq }] = await Promise.all([
      admin.from("blue_memberships").select("status, stripe_subscription_id, source, ended_at").eq("athlete_id", athlete.id),
      admin.from("blue_wiq_subscriptions").select("status, amount_cents, active_until, discount_code").eq("athlete_id", athlete.id),
    ])
    const blue = isEntitled({
      stripe: (stripe ?? []) as never,
      wiq: (wiq ?? []) as never,
      graduationYear: athlete.graduationyear == null ? null : Number(athlete.graduationyear),
    })
    if (!blue) return { sent: 0, skipped: "not a Blue member" }

    const { data: links } = await admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athlete.id)
    const family = new Set<string>(
      [athlete.claimed_by_user_id, ...(links ?? []).map((l) => (l as { user_id: string }).user_id)]
        .filter((id): id is string => typeof id === "string" && id.length > 0 && id !== input.viewerUserId),
    )
    if (family.size === 0) return { sent: 0, skipped: "no family account" }

    const { data: devices, error: deviceError } = await admin
      .from("push_devices")
      .select("expo_push_token")
      .in("user_id", [...family])
      .eq("alert_program_views", true)
    if (deviceError) return { sent: 0, skipped: `devices: ${deviceError.message}` }
    const tokens = [...new Set((devices ?? []).map((d) => (d as { expo_push_token: string }).expo_push_token).filter(Boolean))]
    if (tokens.length === 0) return { sent: 0, skipped: "no linked phones" }

    // Claim this program-week before sending; the unique key makes a second view a no-op.
    const { error: claimError } = await admin.from("push_sent_program_views").insert({
      athlete_id: athlete.id,
      program,
      week_start: weekStart(),
      recipients: tokens.length,
    })
    if (claimError) return { sent: 0, skipped: claimError.code === "23505" ? "already alerted this week" : claimError.message }

    const result = await sendToTokens("alert_program_views", tokens, {
      title: "College interest",
      body: `${program} viewed ${firstName(String(athlete.name ?? "your wrestler"))}'s profile.`,
      // Opens the wrestler in the app (app/athlete/[id].tsx).
      data: { kind: "program_view", athleteId: athlete.id, path: `/athlete/${athlete.id}` },
    })
    return { sent: result.sent }
  } catch (e) {
    console.error("[program-view-alerts]", e instanceof Error ? e.message : e)
    return { sent: 0, skipped: "error" }
  }
}
