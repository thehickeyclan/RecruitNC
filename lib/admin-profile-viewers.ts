/**
 * Admin view of who looked at an athlete's profile — identities included.
 *
 * This is the admin counterpart to lib/profile-view-stats.ts. The athlete-facing panel returns
 * counts only on purpose (naming coaches would make them browse less). Admins get names,
 * because they need to answer "which coach is on this kid?" without signing in as the athlete.
 *
 * Grouped by viewer rather than one row per event: "Roanoke's coach, 12 views, last Tuesday"
 * is the useful unit, not twelve identical lines.
 */

import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer, type ViewerKind } from "@/lib/viewer-role"

export type ProfileViewer = {
  userId: string | null
  name: string
  email: string | null
  role: string
  kind: ViewerKind
  isCoach: boolean
  isCollegeCoach: boolean
  verifiedCoach: boolean
  institution: string | null
  views: number
  firstViewed: string
  lastViewed: string
}

export type AdminProfileViewers = {
  athleteId: string
  athleteName: string | null
  totalViews: number
  anonymousViews: number
  identifiedViewers: number
  coachViewers: number
  collegeCoachViewers: number
  viewers: ProfileViewer[]
}

const ANON: ProfileViewer = {
  userId: null,
  name: "Anonymous (signed out)",
  email: null,
  role: "anonymous",
  kind: "anonymous",
  isCoach: false,
  isCollegeCoach: false,
  verifiedCoach: false,
  institution: null,
  views: 0,
  firstViewed: "",
  lastViewed: "",
}

function displayName(p: Record<string, any> | undefined, userId: string): string {
  if (!p) return `Unknown user (${userId.slice(0, 8)})`
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim()
  return full || p.full_name || p.email || `Unknown user (${userId.slice(0, 8)})`
}

/** Coaches first, then by view count — an admin opens this to find recruiter interest. */
function rank(a: ProfileViewer, b: ProfileViewer): number {
  if (a.isCollegeCoach !== b.isCollegeCoach) return a.isCollegeCoach ? -1 : 1
  if (a.isCoach !== b.isCoach) return a.isCoach ? -1 : 1
  return b.views - a.views
}

export async function loadAdminProfileViewers(athleteId: string): Promise<AdminProfileViewers | null> {
  if (!athleteId) return null

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("user_analytics")
      .select("user_id, created_at, event_data")
      .eq("event_type", "profile_view")
      .eq("event_data->>athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(5000)

    if (error) {
      console.error("[admin-profile-viewers] query failed:", error.message)
      return null
    }

    const rows = (data ?? []) as Array<{ user_id: string | null; created_at: string; event_data: any }>
    const athleteName = rows.find((r) => r.event_data?.athlete_name)?.event_data?.athlete_name ?? null

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[]
    const profiles = new Map<string, Record<string, any>>()
    for (let i = 0; i < userIds.length; i += 50) {
      const { data: batch } = await supabase
        .from("user_profiles")
        .select("user_id, email, first_name, last_name, full_name, role, verified_coach, institution")
        .in("user_id", userIds.slice(i, i + 50))
      for (const p of batch ?? []) profiles.set((p as any).user_id, p as any)
    }

    const byViewer = new Map<string, ProfileViewer>()
    const anon: ProfileViewer = { ...ANON }

    for (const r of rows) {
      const at = r.created_at
      if (!r.user_id) {
        anon.views++
        if (!anon.lastViewed || at > anon.lastViewed) anon.lastViewed = at
        if (!anon.firstViewed || at < anon.firstViewed) anon.firstViewed = at
        continue
      }

      let v = byViewer.get(r.user_id)
      if (!v) {
        const p = profiles.get(r.user_id)
        // Prefer the classification stored at write time; fall back to the live role for
        // rows written before scripts/backfill-profile-view-roles.sql ran.
        const stored = r.event_data?.viewer_kind as ViewerKind | undefined
        const live = classifyViewer(p ?? null)
        v = {
          userId: r.user_id,
          name: displayName(p, r.user_id),
          email: p?.email ?? null,
          role: (r.event_data?.viewer_role as string) ?? live.role,
          kind: stored ?? live.kind,
          isCoach: stored ? r.event_data?.is_coach === true : live.isCoach,
          isCollegeCoach: stored ? r.event_data?.is_college_coach === true : live.isCollegeCoach,
          verifiedCoach: p?.verified_coach === true,
          institution: p?.institution?.trim() || null,
          views: 0,
          firstViewed: at,
          lastViewed: at,
        }
        byViewer.set(r.user_id, v)
      }
      v.views++
      if (at > v.lastViewed) v.lastViewed = at
      if (at < v.firstViewed) v.firstViewed = at
    }

    const viewers = [...byViewer.values()].sort(rank)
    if (anon.views > 0) viewers.push(anon) // always last: no identity to rank

    return {
      athleteId,
      athleteName,
      totalViews: rows.length,
      anonymousViews: anon.views,
      identifiedViewers: byViewer.size,
      coachViewers: viewers.filter((v) => v.isCoach).length,
      collegeCoachViewers: viewers.filter((v) => v.isCollegeCoach).length,
      viewers,
    }
  } catch (e) {
    console.error("[admin-profile-viewers] failed:", e instanceof Error ? e.message : e)
    return null
  }
}
