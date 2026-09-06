/**
 * Which college programs looked at a wrestler, for the athlete and their family.
 *
 * The one thing on the profile that renews itself: rankings update monthly, a scouting report
 * is read once, but "who is looking at my kid" changes on its own and a parent checks it.
 *
 * Two deliberate limits:
 *
 * - **The school is named, never the coach.** Most staffs are one or two people so this is
 *   not real anonymity, and it must not be sold as such — but a program expressing interest
 *   reads very differently from a named adult watching a minor.
 * - **Coach traffic is thin.** 271 coach views across 113 athletes, and one month carries
 *   more than half of them. Most wrestlers will have none, so the empty state has to be
 *   honest and useful rather than a blank panel somebody paid for.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { collegeForCoach } from "@/lib/college-domain-schools"

export type CoachViewSummary = {
  /** Distinct programs that have viewed, most recent first. */
  schools: Array<{ school: string; lastViewedAt: string; views: number }>
  totalViews: number
  distinctCoaches: number
  /** Views in the last 30 days — the number worth a notification. */
  recentViews: number
}

const RECENT_WINDOW_DAYS = 30

/**
 * Coach views of one athlete.
 *
 * Reads `profile_view` events, which already carry `athlete_id` and `is_college_coach` in
 * their payload — the classification happened when the view was recorded, using the role
 * rules, so this does not re-derive it and cannot disagree with what was logged.
 */
export async function getCoachViewsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<CoachViewSummary> {
  const empty: CoachViewSummary = { schools: [], totalViews: 0, distinctCoaches: 0, recentViews: 0 }
  if (!athleteId?.trim()) return empty

  const { data, error } = await supabase
    .from("user_analytics")
    .select("user_id, created_at, event_data")
    .eq("event_type", "profile_view")
    .contains("event_data", { athlete_id: athleteId, is_college_coach: true })
    .order("created_at", { ascending: false })
    .limit(500)
  if (error || !data?.length) return empty

  const coachIds = [...new Set(data.map((row) => String(row.user_id)).filter(Boolean))]
  const schoolByCoach = new Map<string, string | null>()
  if (coachIds.length) {
    const { data: coaches } = await supabase
      .from("user_profiles")
      .select("user_id, email, institution")
      .in("user_id", coachIds)
    for (const coach of coaches ?? []) {
      schoolByCoach.set(
        String(coach.user_id),
        collegeForCoach({ institution: coach.institution as string, email: coach.email as string }),
      )
    }
  }

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 86_400_000
  const bySchool = new Map<string, { school: string; lastViewedAt: string; views: number }>()
  let recentViews = 0

  for (const row of data) {
    const at = String(row.created_at)
    if (Date.parse(at) >= cutoff) recentViews += 1

    // A coach on a non-.edu address has no school we can state. Their view still counts
    // toward the totals — it happened — but naming a program we cannot identify would be a
    // guess on a recruiting notification.
    const school = schoolByCoach.get(String(row.user_id))
    if (!school) continue

    const existing = bySchool.get(school)
    if (existing) {
      existing.views += 1
      if (at > existing.lastViewedAt) existing.lastViewedAt = at
    } else {
      bySchool.set(school, { school, lastViewedAt: at, views: 1 })
    }
  }

  return {
    schools: [...bySchool.values()].sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt)),
    totalViews: data.length,
    distinctCoaches: coachIds.length,
    recentViews,
  }
}

/**
 * What a free viewer is told.
 *
 * The count without the names — enough to be worth something, not enough to remove the
 * reason to subscribe. Zero stays zero: teasing "someone looked" when nobody did would be a
 * lie, and it is the exact lie that makes people distrust recruiting sites.
 */
export function teaseCoachViews(summary: CoachViewSummary): {
  hasViews: boolean
  programCount: number
  totalViews: number
} {
  return {
    hasViews: summary.totalViews > 0,
    programCount: summary.schools.length,
    totalViews: summary.totalViews,
  }
}
