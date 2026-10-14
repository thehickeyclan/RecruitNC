/**
 * The numbers that sell the platform: college coaches on it, the programs they coach, and every
 * profile view they have made (Matt, 14 October 2026, for the /rankings page).
 *
 * Counted, never typed. A coach is a non-admin profile whose role is college coach
 * (lib/viewer-role.ts), less our own test accounts and the App Store review login, which would
 * otherwise each be "a coach" and "a program". A program is the coach's linked school, or the
 * institution they typed when no school is linked yet, so "UNC Pembroke" and "UNC-Pembroke" on two
 * linked coaches count once. Views are profile_view events by those coaches, all time.
 *
 * Cached for an hour in memory: these move by a handful a day, and the page is public.
 */
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { classifyViewer } from "@/lib/viewer-role"

export type PlatformStats = {
  coaches: number
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
  const programs = new Set<string>()
  for (const c of coaches) {
    const key = c.school_id ? `school:${c.school_id}` : String(c.institution ?? "").trim().toLowerCase()
    if (key) programs.add(key)
  }

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

  const value = { coaches: coaches.length, programs: programs.size, coachViews, profilesViewed: reached.size }
  cached = { at: Date.now(), value }
  return value
}
