/**
 * The wrestlers a coach is most likely to weigh this one against: same class, same gender, North
 * Carolina, nearest in weight - ranked ones first. Offered as one-tap comparisons, because a coach
 * who has to think of a name to compare against usually doesn't.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { athleteStateCode, COMPARE_STATES, inState } from "@/lib/recruiting/states"

export type SimilarWrestler = { id: string; name: string; school: string | null; weight: string | null; rank: number | null }

const weightOf = (raw: unknown): number | null => {
  const m = String(raw ?? "").match(/(\d{2,3})/)
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) && n >= 70 && n <= 300 ? n : null
}

/** Pure ordering, so the rule is testable: published rank first, then nearest weight, then name. */
export function rankSimilar(
  target: { id: string; weight: number },
  candidates: Array<{ id: string; name: string; highschool: string | null; weightclass: unknown; prospect_ranking: unknown; graduationyear: number; gender?: unknown }>,
  limit: number,
  maxGap = 8,
): SimilarWrestler[] {
  return candidates
    .map((c) => {
      const w = weightOf(c.weightclass)
      const raw = Number(c.prospect_ranking)
      // Only the published cut is a ranking (rankings stop at 30); past it is an unranked pool.
      const rank =
        Number.isFinite(raw) && raw >= 1 && isPublicRankingsYearPublished(c.graduationyear, c.gender) && raw <= getPublicRankingsMax(c.graduationyear, c.gender)
          ? raw
          : null
      return { c, w, rank }
    })
    .filter((x) => x.c.id !== target.id && x.w != null && Math.abs(x.w - target.weight) <= maxGap)
    .sort(
      (a, b) =>
        Number(a.rank == null) - Number(b.rank == null) ||
        (a.rank ?? 0) - (b.rank ?? 0) ||
        Math.abs(a.w! - target.weight) - Math.abs(b.w! - target.weight) ||
        a.c.name.localeCompare(b.c.name),
    )
    .slice(0, limit)
    .map(({ c, rank }) => ({ id: c.id, name: c.name, school: c.highschool, weight: c.weightclass == null ? null : String(c.weightclass), rank }))
}

export async function loadSimilarWrestlers(supabase: SupabaseClient, athleteId: string, limit = 4): Promise<SimilarWrestler[]> {
  const { data: a } = await supabase
    .from("athletes")
    .select("id, graduationyear, weightclass, gender, is_nc_athlete, state")
    .eq("id", athleteId)
    .maybeSingle()
  const weight = weightOf(a?.weightclass)
  // Wrestlers from his own state: an NC wrestler is compared with NC wrestlers, as before.
  const state = athleteStateCode(a)
  // The comparison these feed opens one state at a time (COMPARE_STATES).
  if (!a || !state || !COMPARE_STATES.includes(state) || !a.graduationyear || weight == null) return []
  let q = inState(supabase.from("athletes").select("id, name, highschool, weightclass, prospect_ranking, graduationyear, gender"), state)
    .eq("graduationyear", a.graduationyear)
    .limit(1000)
  q = a.gender ? q.eq("gender", a.gender) : q
  const { data } = await q
  return rankSimilar({ id: String(a.id), weight }, (data ?? []) as never, limit)
}
