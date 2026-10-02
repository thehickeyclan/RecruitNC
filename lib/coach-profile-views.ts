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
import { countsAsCoachView } from "@/lib/coach-view-rule"

export type CoachViewSummary = {
  /** Distinct programs that have viewed, most recent first. */
  schools: Array<{ school: string; lastViewedAt: string; views: number }>
  /**
   * Every view, newest first, all time.
   *
   * The grouped list answers "who is interested"; this answers "when did they look", which is
   * the question a family actually re-opens the page for. A programme that looked three times
   * in March and once last night is a different story from one that looked four times in March,
   * and grouping hid the difference.
   *
   * `school` is null when the coach's address is not a .edu we can place. The view is still
   * listed - it happened, and a list that does not add up to the stated total reads as a bug -
   * but no programme is named, because naming one would be a guess.
   */
  visits: Array<{ school: string | null; at: string }>
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
  const empty: CoachViewSummary = { schools: [], visits: [], totalViews: 0, distinctCoaches: 0, recentViews: 0 }
  if (!athleteId?.trim()) return empty

  /*
   * Who counts as a coach is decided on read, not from the event.
   *
   * `is_college_coach` is written into the payload when the view happens, from `profile_type` -
   * a field nobody maintains, on which most college coaches were recorded as "fan". Filtering on
   * it silently dropped real coach views: NC State opened Connor Reece's profile in February and
   * the family panel showed two views instead of three, while the admin page - which classifies
   * by current role - showed all three. Same event, two answers.
   *
   * So the athlete is filtered server-side and the coach test happens here, through the one
   * classifier the admin pages use. History corrects itself as roles are fixed, with no backfill,
   * and the two surfaces cannot disagree again.
   */
  const { data, error } = await supabase
    .from("user_analytics")
    .select("user_id, created_at, event_data")
    .eq("event_type", "profile_view")
    .contains("event_data", { athlete_id: athleteId })
    .order("created_at", { ascending: false })
    .limit(2000)
  if (error || !data?.length) return empty

  /* Signed-out views carry a null user_id, and String(null) is "null" - a truthy string that
     filter(Boolean) keeps and Postgres rejects as a uuid, failing the whole lookup. */
  const viewerIds = [
    ...new Set(data.map((row) => row.user_id).filter((id): id is string => typeof id === "string" && id.length > 0)),
  ]
  const schoolByCoach = new Map<string, string | null>()
  const isCoach = new Set<string>()
  if (viewerIds.length) {
    const { data: viewers } = await supabase
      .from("user_profiles")
      .select("user_id, email, institution, role, profile_type, verified_coach, is_admin")
      .in("user_id", viewerIds)
    for (const viewer of viewers ?? []) {
      const id = String(viewer.user_id)
      if (!countsAsCoachView(viewer as never)) continue
      isCoach.add(id)
      schoolByCoach.set(
        id,
        collegeForCoach({ institution: viewer.institution as string, email: viewer.email as string }),
      )
    }
  }

  const coachRows = data.filter((row) => isCoach.has(String(row.user_id)))
  if (!coachRows.length) return empty
  const coachIds = [...new Set(coachRows.map((row) => String(row.user_id)))]

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 86_400_000
  const bySchool = new Map<string, { school: string; lastViewedAt: string; views: number }>()
  const visits: Array<{ school: string | null; at: string }> = []
  let recentViews = 0

  for (const row of coachRows) {
    const at = String(row.created_at)
    if (Date.parse(at) >= cutoff) recentViews += 1
    /* Every view, named or not. The query already returns newest first. */
    visits.push({ school: schoolByCoach.get(String(row.user_id)) ?? null, at })

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
    visits,
    totalViews: coachRows.length,
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
