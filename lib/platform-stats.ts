/**
 * The numbers that sell the platform: college coaches on it, the programs they coach, and every
 * profile view they have made (Matt, 14 October 2026, for the /rankings page).
 *
 * Counted, never typed. A coach is a non-admin profile whose role is college coach
 * (lib/viewer-role.ts), less our own test accounts and the App Store review login, which would
 * otherwise each be "a coach" and "a program". Views are profile_view events by those coaches,
 * all time.
 *
 * A program is a dot on the college map with an approved coach on it — the same set the map's
 * "On RecruitWrestlers" filter counts (lib/college-programs/load.ts). It used to be the coach's
 * linked school or whatever institution they had typed, which counted two more than the map did:
 * the /command-center page said 86 programs a few hundred pixels above a filter reading 84
 * (Matt's review, 3 Nov 2026). The map's number is the one a family can click and check, so it
 * wins, and every surface reads it from here.
 *
 * Cached for an hour in memory: these move by a handful a day, and the page is public.
 */
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { schoolsWithApprovedCoaches } from "@/lib/college-programs/load"
import { classifyViewer } from "@/lib/viewer-role"

export type PlatformStats = {
  coaches: number
  /** College map programs with an approved coach: the map's own "On RecruitWrestlers" count. */
  programs: number
  /** Every profile view by a college coach, all time. */
  coachViews: number
  /** Distinct wrestler profiles those views reached. */
  profilesViewed: number
}

const NOT_A_COACH_EMAIL = /(^test@example\.com$)|(\+applereview@)|(^testcoach\.)/i
const NOT_A_PROGRAM = /^(nc wrestling united|app review)$/i

let cached: { at: number; value: PlatformStats } | null = null
const HOUR = 3_600_000

export async function loadPlatformStats(admin: SupabaseClient): Promise<PlatformStats> {
  if (cached && Date.now() - cached.at < HOUR) return cached.value

  const profiles: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("user_profiles")
      .select("user_id, email, role, profile_type, verified_coach, is_admin, institution, school_id")
      .order("id")
      .range(from, from + 999)
    if (error || !data?.length) break
    profiles.push(...(data as Array<Record<string, unknown>>))
    if (data.length < 1000) break
  }

  const coaches = profiles.filter(
    (p) =>
      p.is_admin !== true &&
      classifyViewer(p as never).isCollegeCoach &&
      !NOT_A_COACH_EMAIL.test(String(p.email ?? "")) &&
      !NOT_A_PROGRAM.test(String(p.institution ?? "").trim()),
  )
  // The map's own count, so the stats band and the map filter never disagree on the same page.
  // A failed lookup leaves it at 0, which the sales bands drop rather than print, and the hour's
  // cache is skipped below so the next request tries again instead of hiding the row all hour.
  const programs = (await schoolsWithApprovedCoaches(admin).catch(() => null))?.size ?? 0

  const coachIds = new Set(coaches.map((c) => String(c.user_id)))
  let coachViews = 0
  const reached = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("user_analytics")
      .select("user_id, event_data")
      .eq("event_type", "profile_view")
      .not("user_id", "is", null)
      .order("id")
      .range(from, from + 999)
    if (error || !data?.length) break
    for (const row of data as Array<{ user_id: string | null; event_data: { athlete_id?: string } | null }>) {
      if (!coachIds.has(String(row.user_id))) continue
      coachViews += 1
      if (row.event_data?.athlete_id) reached.add(row.event_data.athlete_id)
    }
    if (data.length < 1000) break
  }

  const value = { coaches: coaches.length, programs, coachViews, profilesViewed: reached.size }
  if (programs > 0) cached = { at: Date.now(), value }
  return value
}
