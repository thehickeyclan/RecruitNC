/**
 * College-coach interest, as a selling signal - never as an identity.
 *
 * Two answers, both deliberately thin: whether a profile has been viewed by a college coach at
 * all (for the claim prompt), and how many NC wrestler profiles college coaches viewed in the
 * last 30 days (for the rankings sales page). Which programs looked stays behind the
 * subscription (components/coach-views-panel.tsx); nothing here names one.
 *
 * Reads user_analytics profile_view events. A viewer counts when their role is college coach
 * (lib/viewer-role.ts) and they are not an admin - admins browse every profile.
 */
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { classifyViewer } from "@/lib/viewer-role"

type ViewRow = { user_id: string | null; event_data: { athlete_id?: string } | null }

async function collegeCoachIds(admin: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  for (let i = 0; i < userIds.length; i += 300) {
    const { data } = await admin
      .from("user_profiles")
      .select("user_id, role, profile_type, verified_coach, is_admin")
      .in("user_id", userIds.slice(i, i + 300))
    for (const p of (data ?? []) as Array<Record<string, unknown>>) {
      if (p.is_admin === true) continue
      const c = classifyViewer(p as never)
      if (c.isCollegeCoach && c.kind !== "admin") out.add(String(p.user_id))
    }
  }
  return out
}

/** Has any college coach viewed this profile? */
export async function athleteHasCollegeViews(admin: SupabaseClient, athleteId: string): Promise<boolean> {
  const { data } = await admin
    .from("user_analytics")
    .select("user_id")
    .eq("event_type", "profile_view")
    .eq("event_data->>athlete_id", athleteId)
    .not("user_id", "is", null)
    .limit(500)
  const ids = [...new Set(((data ?? []) as ViewRow[]).map((r) => String(r.user_id)))]
  if (!ids.length) return false
  return (await collegeCoachIds(admin, ids)).size > 0
}

let cached: { at: number; value: { profilesViewed: number; coaches: number } } | null = null
const HOUR = 3_600_000

/** NC wrestler profiles viewed by college coaches in the last 30 days, and by how many coaches. */
export async function recentCollegeViewStats(admin: SupabaseClient): Promise<{ profilesViewed: number; coaches: number }> {
  if (cached && Date.now() - cached.at < HOUR) return cached.value
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const rows: ViewRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("user_analytics")
      .select("user_id, event_data")
      .eq("event_type", "profile_view")
      .not("user_id", "is", null)
      .gte("created_at", since)
      .range(from, from + 999)
    if (error || !data?.length) break
    rows.push(...(data as ViewRow[]))
    if (data.length < 1000) break
  }
  const coaches = await collegeCoachIds(admin, [...new Set(rows.map((r) => String(r.user_id)))])
  const profiles = new Set<string>()
  const active = new Set<string>()
  for (const r of rows) {
    const aid = r.event_data?.athlete_id
    if (!aid || !coaches.has(String(r.user_id))) continue
    profiles.add(aid)
    active.add(String(r.user_id))
  }
  const value = { profilesViewed: profiles.size, coaches: active.size }
  cached = { at: Date.now(), value }
  return value
}
