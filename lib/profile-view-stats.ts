/**
 * "Who's looking at me" numbers for an athlete's own profile.
 *
 * Counts only — never identities. An athlete seeing which coaches viewed them would make
 * coaches browse less, which costs the athlete the very signal this is meant to surface.
 *
 * Reads user_analytics profile_view events. Two things to know:
 *
 *  - Rows written before scripts/backfill-profile-view-roles.sql carry no viewer_kind, so
 *    this falls back to classifying live from user_profiles.role. That means the panel is
 *    correct whether or not the backfill has run; the backfill just makes it cheaper.
 *  - Institution is unusable as a label: 1 of 33 college coaches has it set. So we report
 *    "N college coaches", never "N colleges".
 */

import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"

export type ProfileViewStats = {
  totalViews: number
  /** Distinct signed-in viewers. Anonymous views can't be deduped (user_id is null). */
  uniqueViewers: number
  coachViews: number
  distinctCoaches: number
  collegeCoachViews: number
  distinctCollegeCoaches: number
  last30: {
    totalViews: number
    coachViews: number
    distinctCollegeCoaches: number
  }
  /** Oldest event we hold, so the UI can say "since March" rather than imply all-time. */
  since: string | null
}

const EMPTY: ProfileViewStats = {
  totalViews: 0,
  uniqueViewers: 0,
  coachViews: 0,
  distinctCoaches: 0,
  collegeCoachViews: 0,
  distinctCollegeCoaches: 0,
  last30: { totalViews: 0, coachViews: 0, distinctCollegeCoaches: 0 },
  since: null,
}

type ViewRow = {
  user_id: string | null
  created_at: string
  event_data: Record<string, unknown> | null
}

export async function loadProfileViewStats(athleteId: string, now = Date.now()): Promise<ProfileViewStats> {
  if (!athleteId) return EMPTY

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("user_analytics")
      .select("user_id, created_at, event_data")
      .eq("event_type", "profile_view")
      .eq("event_data->>athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(5000)

    if (error || !Array.isArray(data) || data.length === 0) {
      if (error) console.error("[profile-view-stats] query failed:", error.message)
      return EMPTY
    }

    const rows = data as ViewRow[]

    // Pre-backfill rows have no viewer_kind — classify those from the current role.
    const needsLookup = [
      ...new Set(
        rows
          .filter((r) => r.user_id && r.event_data?.viewer_kind == null)
          .map((r) => r.user_id as string),
      ),
    ]

    const roleByUser = new Map<string, { role: unknown; verified_coach: unknown }>()
    for (let i = 0; i < needsLookup.length; i += 50) {
      const { data: profs } = await supabase
        .from("user_profiles")
        .select("user_id, role, verified_coach")
        .in("user_id", needsLookup.slice(i, i + 50))
      for (const p of profs ?? []) {
        roleByUser.set((p as any).user_id, { role: (p as any).role, verified_coach: (p as any).verified_coach })
      }
    }

    const isCoachRow = (r: ViewRow): { coach: boolean; college: boolean } => {
      const stored = r.event_data?.viewer_kind
      if (stored != null) {
        return {
          coach: r.event_data?.is_coach === true,
          college: r.event_data?.is_college_coach === true,
        }
      }
      if (!r.user_id) return { coach: false, college: false }
      const v = classifyViewer(roleByUser.get(r.user_id) ?? null)
      return { coach: v.isCoach, college: v.isCollegeCoach }
    }

    const cutoff = now - 30 * 24 * 60 * 60 * 1000
    const uniqueViewers = new Set<string>()
    const coaches = new Set<string>()
    const collegeCoaches = new Set<string>()
    const collegeCoaches30 = new Set<string>()
    let coachViews = 0
    let collegeCoachViews = 0
    let total30 = 0
    let coachViews30 = 0

    for (const r of rows) {
      if (r.user_id) uniqueViewers.add(r.user_id)
      const { coach, college } = isCoachRow(r)
      const recent = new Date(r.created_at).getTime() >= cutoff

      if (coach) {
        coachViews++
        if (r.user_id) coaches.add(r.user_id)
        if (recent) coachViews30++
      }
      if (college) {
        collegeCoachViews++
        if (r.user_id) collegeCoaches.add(r.user_id)
        if (recent && r.user_id) collegeCoaches30.add(r.user_id)
      }
      if (recent) total30++
    }

    return {
      totalViews: rows.length,
      uniqueViewers: uniqueViewers.size,
      coachViews,
      distinctCoaches: coaches.size,
      collegeCoachViews,
      distinctCollegeCoaches: collegeCoaches.size,
      last30: { totalViews: total30, coachViews: coachViews30, distinctCollegeCoaches: collegeCoaches30.size },
      since: rows[rows.length - 1]?.created_at ?? null,
    }
  } catch (e) {
    console.error("[profile-view-stats] failed:", e instanceof Error ? e.message : e)
    return EMPTY
  }
}
