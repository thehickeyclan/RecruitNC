import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { hasGraduated, isEntitled } from "@/lib/blue-membership"
import { collegeForCoach } from "@/lib/college-domain-schools"
import { isApprovedCoach } from "@/lib/coach-messages"
import { isInternalAccount } from "@/lib/internal-accounts"
import { sendToTokens } from "@/lib/push-send"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { hasPremiumAccess } from "@/lib/ranking-visibility"

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
 * - **Every family, the name for paid ones (2 Nov 2026).** It was Blue only, so the moment a college
 *   looked - the best reason to upgrade - reached nobody who could. Now a phone signed in to a
 *   paid account (the wrestler's Blue, or that account's own Insider or Command Center) gets the
 *   program; a free account gets "A college program viewed..." and the way to see which. The
 *   same rule as the "who viewed" panel and the weekly email: names for a subscriber, the
 *   count for everyone. Graduated wrestlers get nothing.
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
    // Our own test and review logins are approved coaches too; a family is never alerted to us.
    if (isInternalAccount(viewer.email as string | null)) return { sent: 0, skipped: "internal account" }

    const program = collegeForCoach({ institution: viewer.institution as string | null, email: viewer.email as string | null })
    if (!program) return { sent: 0, skipped: "no program" }

    const { data: athlete } = await admin
      .from("athletes")
      .select("id, name, claimed_by_user_id, graduationyear")
      .eq("id", input.athleteId)
      .maybeSingle()
    if (!athlete) return { sent: 0, skipped: "no athlete" }

    if (hasGraduated(athlete.graduationyear == null ? null : Number(athlete.graduationyear))) {
      return { sent: 0, skipped: "graduated" }
    }

    // Blue belongs to the wrestler, so it names the program for every phone in the family.
    const [{ data: stripe }, { data: wiq }] = await Promise.all([
      admin.from("blue_memberships").select("status, stripe_subscription_id, source, ended_at").eq("athlete_id", athlete.id),
      admin.from("blue_wiq_subscriptions").select("status, amount_cents, active_until, discount_code").eq("athlete_id", athlete.id),
    ])
    const blue = isEntitled({
      stripe: (stripe ?? []) as never,
      wiq: (wiq ?? []) as never,
      graduationYear: athlete.graduationyear == null ? null : Number(athlete.graduationyear),
    })

    const { data: links } = await admin.from("parent_athlete_links").select("user_id").eq("athlete_id", athlete.id)
    const family = new Set<string>(
      [athlete.claimed_by_user_id, ...(links ?? []).map((l) => (l as { user_id: string }).user_id)]
        .filter((id): id is string => typeof id === "string" && id.length > 0 && id !== input.viewerUserId),
    )
    if (family.size === 0) return { sent: 0, skipped: "no family account" }

    const { data: devices, error: deviceError } = await admin
      .from("push_devices")
      .select("user_id, expo_push_token")
      .in("user_id", [...family])
      .eq("alert_program_views", true)
    if (deviceError) return { sent: 0, skipped: `devices: ${deviceError.message}` }
    const rows = (devices ?? []) as Array<{ user_id: string; expo_push_token: string }>
    if (!rows.some((d) => d.expo_push_token)) return { sent: 0, skipped: "no linked phones" }

    // Insider and the Command Center are bought per account, so each phone's owner is asked.
    const paidUsers = new Set<string>()
    if (!blue) {
      for (const userId of new Set(rows.map((d) => d.user_id))) {
        const { viewer } = await resolveRankingViewerForUser({ admin, userId, athleteId: athlete.id })
        if (hasPremiumAccess(viewer)) paidUsers.add(userId)
      }
    }
    const named = [...new Set(rows.filter((d) => d.expo_push_token && (blue || paidUsers.has(d.user_id))).map((d) => d.expo_push_token))]
    const locked = [...new Set(rows.filter((d) => d.expo_push_token && !(blue || paidUsers.has(d.user_id))).map((d) => d.expo_push_token))].filter(
      (t) => !named.includes(t),
    )

    // Claim this program-week before sending; the unique key makes a second view a no-op.
    const { error: claimError } = await admin.from("push_sent_program_views").insert({
      athlete_id: athlete.id,
      program,
      week_start: weekStart(),
      recipients: named.length + locked.length,
    })
    if (claimError) return { sent: 0, skipped: claimError.code === "23505" ? "already alerted this week" : claimError.message }

    const who = firstName(String(athlete.name ?? "your wrestler"))
    // Opens the wrestler in the app (app/(tabs)/athlete/[id].tsx), a route every shipped build has.
    const data = { kind: "program_view", athleteId: athlete.id, path: `/athlete/${athlete.id}` }
    let sent = 0
    if (named.length > 0) {
      sent += (await sendToTokens("alert_program_views", named, { title: "College interest", body: programViewBody(program, who), data })).sent
    }
    if (locked.length > 0) {
      // The program stays off a free phone entirely - not in the body, not in the data.
      sent += (await sendToTokens("alert_program_views", locked, { title: "College interest", body: programViewBody(null, who), data })).sent
    }
    return { sent }
  } catch (e) {
    console.error("[program-view-alerts]", e instanceof Error ? e.message : e)
    return { sent: 0, skipped: "error" }
  }
}

/** The alert text: the program for a paid account, the fact and the way to see it for a free one. */
export function programViewBody(program: string | null, wrestlerFirstName: string): string {
  return program
    ? `${program} viewed ${wrestlerFirstName}'s profile.`
    : `A college program viewed ${wrestlerFirstName}'s profile. See which with Insider.`
}
