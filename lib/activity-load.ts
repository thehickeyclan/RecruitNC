/**
 * Activity status for a set of wrestlers, in bulk - for the comparison and My Recruits.
 *
 * Last competed comes from lib/prospect-last-competed.ts, the same reading the directory column
 * uses (duals and in-season bouts included), so the three surfaces agree on the date.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { activityStatus, type ActivityStatus } from "@/lib/activity-status"

export async function loadActivity(
  supabase: SupabaseClient,
  athletes: Array<{ id: string; graduationyear?: unknown }>,
  now: Date = new Date(),
): Promise<Map<string, ActivityStatus>> {
  const ids = [...new Set(athletes.map((a) => String(a.id)).filter(Boolean))]
  const out = new Map<string, ActivityStatus>()
  if (!ids.length) return out

  const [last, { data: seasons }, { data: state }] = await Promise.all([
    loadLastCompeted(supabase, ids, new Map(athletes.map((a) => [String(a.id), Number(a.graduationyear) || null]))),
    supabase.from("matches").select("athlete_id, season, wins, losses").in("athlete_id", ids),
    supabase.from("wrestling_nchsaa_results").select("athlete_id, year").in("athlete_id", ids),
  ])

  for (const a of athletes) {
    const id = String(a.id)
    const seasonsWithBouts = ((seasons ?? []) as Array<{ athlete_id: string; season: string | null; wins: number | null; losses: number | null }>)
      .filter((r) => r.athlete_id === id && Number(r.wins ?? 0) + Number(r.losses ?? 0) > 0 && r.season)
      .map((r) => String(r.season).trim())
    const stateYears = ((state ?? []) as Array<{ athlete_id: string; year: number }>)
      .filter((r) => r.athlete_id === id)
      .map((r) => Number(r.year))
    const l = last.get(id)
    out.set(id, {
      ...activityStatus(
        {
          last: l ? { event: l.event, date: l.date } : null,
          graduationYear: Number(a.graduationyear) || null,
          seasonsWithBouts,
          stateYears,
        },
        now,
      ),
      lastWeight: l?.weight ?? null,
    })
  }
  return out
}
