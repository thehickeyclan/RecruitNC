/**
 * Which colleges are looking at which athletes, across the whole roster. Admin only.
 *
 * The per-athlete version of this already exists in `coach-profile-views.ts`, for the family:
 * it names the program and never the coach. This one answers the question from the other end
 * — which of our wrestlers are getting college looks, and from whom — so it rolls the same
 * `profile_view` events up by college and by athlete instead of by wrestler alone.
 *
 * Two things to know before reading a number here:
 *
 * - **A college is named from the coach's .edu domain.** A coach browsing on a Gmail address
 *   cannot be attributed to a program, so their views land under "Unidentified program" rather
 *   than being dropped or guessed at. `user_profiles.institution` is checked first but is set
 *   on roughly one coach in forty, so the domain is doing the work.
 * - **Coach traffic is thin.** Around 160 college-coach views all-time. These are readable
 *   numbers, not statistics; one coach having a browse can move a leaderboard.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { collegeForCoach } from "@/lib/college-domain-schools"

export const UNIDENTIFIED_PROGRAM = "Unidentified program" as const

export type CollegeInterestRow = {
  /** A `profile_view` event: who viewed, which athlete, when. */
  coachId: string
  athleteId: string
  athleteName: string | null
  at: string
}

export type AthleteLook = {
  athleteId: string
  athleteName: string
  views: number
  lastViewedAt: string
}

export type CollegeInterest = {
  college: string
  views: number
  coaches: number
  athletes: AthleteLook[]
  lastViewedAt: string
}

export type AthleteInterest = {
  athleteId: string
  athleteName: string
  views: number
  colleges: Array<{ college: string; views: number; lastViewedAt: string }>
  lastViewedAt: string
}

export type CollegeInterestReport = {
  byCollege: CollegeInterest[]
  byAthlete: AthleteInterest[]
  totals: { views: number; colleges: number; coaches: number; athletes: number }
  since: string | null
}

const RANGE_DAYS: Record<string, number> = { last7: 7, last30: 30, last90: 90, year: 365 }

export function cutoffForRange(range: string, now = new Date()): string | null {
  const days = RANGE_DAYS[range]
  if (!days) return null
  return new Date(now.getTime() - days * 86_400_000).toISOString()
}

/**
 * The rollup itself, kept pure so it can be tested without a database.
 *
 * `schoolByCoach` maps a coach's user id to their program, or null when we cannot name one;
 * null becomes `UNIDENTIFIED_PROGRAM` so the view is still counted somewhere visible. A view
 * whose athlete has no name is skipped: an unnamed row in a recruiting report is noise.
 */
export function rollUpCollegeInterest(
  rows: CollegeInterestRow[],
  schoolByCoach: Map<string, string | null>,
): CollegeInterestReport {
  const colleges = new Map<string, { views: number; coaches: Set<string>; athletes: Map<string, AthleteLook>; last: string }>()
  const athletes = new Map<string, { name: string; views: number; colleges: Map<string, { views: number; last: string }>; last: string }>()
  const allCoaches = new Set<string>()
  let views = 0

  for (const row of rows) {
    const name = row.athleteName?.trim()
    if (!row.athleteId || !name) continue
    const college = schoolByCoach.get(row.coachId) || UNIDENTIFIED_PROGRAM
    views += 1
    allCoaches.add(row.coachId)

    const c = colleges.get(college) ?? { views: 0, coaches: new Set<string>(), athletes: new Map<string, AthleteLook>(), last: row.at }
    c.views += 1
    c.coaches.add(row.coachId)
    if (row.at > c.last) c.last = row.at
    const look = c.athletes.get(row.athleteId)
    if (look) {
      look.views += 1
      if (row.at > look.lastViewedAt) look.lastViewedAt = row.at
    } else {
      c.athletes.set(row.athleteId, { athleteId: row.athleteId, athleteName: name, views: 1, lastViewedAt: row.at })
    }
    colleges.set(college, c)

    const a = athletes.get(row.athleteId) ?? { name, views: 0, colleges: new Map<string, { views: number; last: string }>(), last: row.at }
    a.views += 1
    if (row.at > a.last) a.last = row.at
    const seen = a.colleges.get(college)
    if (seen) {
      seen.views += 1
      if (row.at > seen.last) seen.last = row.at
    } else {
      a.colleges.set(college, { views: 1, last: row.at })
    }
    athletes.set(row.athleteId, a)
  }

  /*
   * Most recent first, not most views.
   *
   * "Campbell looked yesterday" is the line a coach or a parent acts on; "Campbell has looked
   * eleven times since March" is history. Ties break on volume so a busy day still outranks a
   * single click at the same timestamp.
   */
  const byCollege = [...colleges.entries()]
    .map(([college, c]) => ({
      college,
      views: c.views,
      coaches: c.coaches.size,
      lastViewedAt: c.last,
      athletes: [...c.athletes.values()].sort((x, y) => y.lastViewedAt.localeCompare(x.lastViewedAt) || y.views - x.views),
    }))
    .sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt) || b.views - a.views)

  const byAthlete = [...athletes.entries()]
    .map(([athleteId, a]) => ({
      athleteId,
      athleteName: a.name,
      views: a.views,
      lastViewedAt: a.last,
      colleges: [...a.colleges.entries()]
        .map(([college, v]) => ({ college, views: v.views, lastViewedAt: v.last }))
        .sort((x, y) => y.lastViewedAt.localeCompare(x.lastViewedAt) || y.views - x.views),
    }))
    .sort((a, b) => b.colleges.length - a.colleges.length || b.views - a.views)

  return {
    byCollege,
    byAthlete,
    totals: { views, colleges: colleges.size, coaches: allCoaches.size, athletes: athletes.size },
    since: null,
  }
}

/**
 * Loads college-coach profile views and rolls them up.
 *
 * Paged, because PostgREST caps a response at 1,000 rows and coach traffic will outgrow that.
 * The `is_college_coach` flag was written when the view was recorded, so this agrees with what
 * the athlete's own page shows rather than re-deriving the classification here.
 */
export async function loadCollegeInterest(
  admin: SupabaseClient,
  range = "all",
): Promise<CollegeInterestReport> {
  const since = cutoffForRange(range)
  const rows: CollegeInterestRow[] = []

  for (let from = 0; ; from += 1000) {
    let query = admin
      .from("user_analytics")
      .select("user_id, created_at, event_data")
      .eq("event_type", "profile_view")
      .contains("event_data", { is_college_coach: true })
      .order("created_at", { ascending: false })
      .range(from, from + 999)
    if (since) query = query.gte("created_at", since)

    const { data, error } = await query
    if (error) break
    for (const row of data ?? []) {
      const payload = (row.event_data ?? {}) as { athlete_id?: string; athlete_name?: string }
      if (!row.user_id || !payload.athlete_id) continue
      rows.push({
        coachId: String(row.user_id),
        athleteId: String(payload.athlete_id),
        athleteName: payload.athlete_name ?? null,
        at: String(row.created_at),
      })
    }
    if ((data ?? []).length < 1000) break
  }

  const coachIds = [...new Set(rows.map((row) => row.coachId))]
  const schoolByCoach = new Map<string, string | null>()
  for (let i = 0; i < coachIds.length; i += 100) {
    const { data } = await admin
      .from("user_profiles")
      .select("user_id, email, institution")
      .in("user_id", coachIds.slice(i, i + 100))
    for (const coach of data ?? []) {
      schoolByCoach.set(
        String(coach.user_id),
        collegeForCoach({ institution: coach.institution as string, email: coach.email as string }),
      )
    }
  }

  return { ...rollUpCollegeInterest(rows, schoolByCoach), since }
}
