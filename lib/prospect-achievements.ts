/**
 * What a wrestler has actually won, read from the tables that hold it.
 *
 * The directory's achievement filter read three JSON blobs off the athlete row —
 * `state_results`, `nhsca_results`, `super32_results`. Two of them are sparse and the first does
 * not exist as a column at all, so every state check compared against `undefined` and returned
 * nothing. Filtering by "State Champion" produced two wrestlers out of two hundred and sixty.
 *
 * Meanwhile the canonical tables held state results for 144 of those same athletes, and
 * everything imported this month — NHSCA bouts, TOC results, state brackets — went into them and
 * was invisible here.
 *
 * So this reads the same sources the rankings and profiles read. A filter that disagrees with
 * the profile it links to is worse than no filter: it tells a college coach a state champion
 * does not exist.
 */
import type { SupabaseClient } from "@supabase/supabase-js"

export type AchievementLevel =
  | "all-american"
  | "state-champion"
  | "state-placer"
  | "state-qualifier"
  | "dnq"

export type AchievementFacts = {
  /** Best NCHSAA finish, 1 for a title. */
  bestStatePlace?: number | null
  /** Did they wrestle at states at all, placed or not? */
  stateQualifier?: boolean
  /** Best NHSCA Nationals finish. */
  bestNhscaPlace?: number | null
  /** Best Super 32 finish. */
  bestSuper32Place?: number | null
}

export type Achievement = { level: AchievementLevel; badge: string; color: string }

/**
 * The loudest true thing about a wrestler.
 *
 * Ordered by what a college coach reads first: a national podium outranks a state title, which
 * outranks a state place, which outranks having been there.
 */
export function highestAchievement(facts: AchievementFacts): Achievement {
  const podium = (place: number | null | undefined) => place != null && place >= 1 && place <= 8
  if (podium(facts.bestNhscaPlace) || podium(facts.bestSuper32Place)) {
    return { level: "all-american", badge: "All-American", color: "bg-purple-600 text-white" }
  }
  if (facts.bestStatePlace === 1) {
    return { level: "state-champion", badge: "State Champion", color: "bg-yellow-500 text-white" }
  }
  const place = facts.bestStatePlace
  if (place != null && place >= 2 && place <= 6) {
    return { level: "state-placer", badge: "State Placer", color: "bg-blue-600 text-white" }
  }
  if (facts.stateQualifier || (place != null && place > 6)) {
    return { level: "state-qualifier", badge: "State Qualifier", color: "bg-green-600 text-white" }
  }
  return { level: "dnq", badge: "DNQ", color: "bg-gray-400 text-white" }
}

/** Smallest positive place wins; nulls and zeroes are "competed, did not place". */
function bestPlace(current: number | null | undefined, candidate: unknown): number | null {
  const value = Number(candidate)
  if (!Number.isFinite(value) || value < 1) return current ?? null
  if (current == null) return value
  return Math.min(current, value)
}

/**
 * Achievements for a set of athletes, in three queries rather than three per wrestler.
 *
 * Super 32 is matched by name because `super32_results` carries no athlete_id — which is a gap
 * worth closing, and until it is, a name match is better than pretending the results are absent.
 */
export async function loadAchievements(
  supabase: SupabaseClient,
  athletes: ReadonlyArray<{ id: string; name?: string | null }>,
): Promise<Map<string, AchievementFacts>> {
  const out = new Map<string, AchievementFacts>()
  const ids = athletes.map((a) => String(a.id)).filter(Boolean)
  if (!ids.length) return out
  const facts = (id: string): AchievementFacts => {
    const existing = out.get(id)
    if (existing) return existing
    const fresh: AchievementFacts = {}
    out.set(id, fresh)
    return fresh
  }

  // PostgREST caps a request, so the ids go in batches rather than one enormous `in`.
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200)
    const [state, nhsca] = await Promise.all([
      supabase.from("wrestling_nchsaa_results").select("athlete_id, place").in("athlete_id", batch),
      supabase.from("nhsca_placements").select("athlete_id, placement").in("athlete_id", batch),
    ])
    for (const row of state.data ?? []) {
      const f = facts(String(row.athlete_id))
      f.bestStatePlace = bestPlace(f.bestStatePlace, row.place)
      // A row in the state table means they were at the state tournament.
      f.stateQualifier = true
    }
    for (const row of nhsca.data ?? []) {
      const f = facts(String(row.athlete_id))
      f.bestNhscaPlace = bestPlace(f.bestNhscaPlace, row.placement)
    }
  }

  const byName = new Map<string, string>()
  for (const a of athletes) {
    const key = String(a.name ?? "").trim().toLowerCase()
    if (key) byName.set(key, String(a.id))
  }
  if (byName.size) {
    const { data } = await supabase.from("super32_results").select("athlete_name, placement")
    for (const row of data ?? []) {
      const id = byName.get(String(row.athlete_name ?? "").trim().toLowerCase())
      if (!id) continue
      const f = facts(id)
      f.bestSuper32Place = bestPlace(f.bestSuper32Place, row.placement)
    }
  }

  return out
}
