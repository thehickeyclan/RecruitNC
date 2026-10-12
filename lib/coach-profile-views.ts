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
import { groupCoachVisits } from "@/lib/coach-view-visits"
import { collegeForCoach } from "@/lib/college-domain-schools"
import { countsAsCoachView } from "@/lib/coach-view-rule"
import { resolveEntityLogoUrl, sameSchoolName } from "@/lib/entity-logo-resolve"

export type CoachViewSummary = {
  /** Distinct programs that have viewed, most recent first. */
  schools: Array<{ school: string; lastViewedAt: string; views: number; logo?: string | null }>
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
  /** The logo a person uploaded for a program's school record, by the program's name. */
  const uploadedLogo = new Map<string, string>()
  if (viewerIds.length) {
    const { data: viewers } = await supabase
      .from("user_profiles")
      .select("user_id, email, institution, role, profile_type, verified_coach, is_admin, school_id")
      .in("user_id", viewerIds)
    const coaches = (viewers ?? []).filter((viewer) => countsAsCoachView(viewer as never))
    /*
     * The program is the coach's school record, not whatever he typed as his institution.
     *
     * Three Virginia coaches typed "The University of Virginia", "University of Virginia Wrestling"
     * and "Virginia". Named from that text, a family saw three programs where there was one, and
     * none of the three spellings found the school's logo. They share one school record, which
     * carries one name and the logo a person uploaded for it.
     */
    const schoolIds = [...new Set(coaches.map((c) => c.school_id as string | null).filter((id): id is string => Boolean(id)))]
    const { data: schoolRows } = schoolIds.length
      ? await supabase.from("schools").select("id, name, logo_url").in("id", schoolIds)
      : { data: [] as Array<{ id: string; name: string | null; logo_url: string | null }> }
    const schoolById = new Map((schoolRows ?? []).map((row) => [String(row.id), row]))
    for (const viewer of coaches) {
      const id = String(viewer.user_id)
      isCoach.add(id)
      const record = viewer.school_id ? schoolById.get(String(viewer.school_id)) : null
      const recordName = String(record?.name ?? "").trim()
      const name = recordName || collegeForCoach({ institution: viewer.institution as string, email: viewer.email as string })
      schoolByCoach.set(id, name)
      if (name && record?.logo_url && !uploadedLogo.has(name)) uploadedLogo.set(name, String(record.logo_url))
    }
  }

  const coachRows = data.filter((row) => isCoach.has(String(row.user_id)))
  if (!coachRows.length) return empty
  const coachIds = [...new Set(coachRows.map((row) => String(row.user_id)))]

  const cutoff = Date.now() - RECENT_WINDOW_DAYS * 86_400_000
  const bySchool = new Map<string, { school: string; lastViewedAt: string; views: number; logo: string | null }>()
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

    /* "Washington & Lee" and "Washington and Lee University" are one program, counted once. */
    const existing = bySchool.get(school) ?? [...bySchool.values()].find((entry) => sameSchoolName(entry.school, school))
    if (existing) {
      existing.views += 1
      if (at > existing.lastViewedAt) existing.lastViewedAt = at
      existing.logo ??= uploadedLogo.get(school) ?? null
    } else {
      bySchool.set(school, { school, lastViewedAt: at, views: 1, logo: uploadedLogo.get(school) ?? null })
    }
  }

  /*
   * The logo travels with the name. The page used to look each name up by itself, so a program
   * whose name did not match a logo entry letter for letter showed initials beside it - "VW" for
   * Virginia. An uploaded school logo wins; otherwise the site's logo for the same school; else none.
   */
  await Promise.all(
    [...bySchool.values()]
      .filter((entry) => !entry.logo)
      .map(async (entry) => {
        entry.logo = (await resolveEntityLogoUrl("college", entry.school).catch(() => null)) ?? null
      }),
  )

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
 * When and how often, never who. Each visit comes through with its time and view count and no
 * program at all - the page draws a blurred placeholder where the name would be. The name is
 * withheld here rather than blurred on the page because a CSS blur over a real name is one
 * inspector click from being read, and the name is the thing being sold.
 *
 * Zero stays zero: teasing "someone looked" when nobody did would be a lie, and it is the exact
 * lie that makes people distrust recruiting sites.
 */
export function teaseCoachViews(summary: CoachViewSummary): {
  hasViews: boolean
  programCount: number
  totalViews: number
  visits: Array<{ first: string; last: string; views: number }>
} {
  return {
    hasViews: summary.totalViews > 0,
    programCount: summary.schools.length,
    totalViews: summary.totalViews,
    visits: groupCoachVisits(summary.visits).map(({ first, last, views }) => ({ first, last, views })),
  }
}
