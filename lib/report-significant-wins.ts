/**
 * The significant wins and losses a coach sees on the scouting report, from raw bouts.
 *
 * One function because three surfaces need the same list: the report prints it, and the star
 * rating scores it both there and on the admin ranking board. Computed separately, a win could
 * count toward a star on one page and be missing from the table that explains the star on another.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { mergeBoutSources } from "@/lib/bout-source-deduplication"
import { getQualifierSignificantWinBouts } from "@/lib/other-tournaments"
import {
  findSignificantLosses,
  findSignificantWins,
  withAccoladesOnly,
  type Bout,
  type OpponentIndex,
  type SignificantWin,
} from "@/lib/significant-wins"
import { latestSeasonMatchRows } from "@/lib/toc/ai-seeding"
import { highSchoolBouts, isHighSchoolSeason } from "@/lib/high-school-window"

export type MatchSeasonRow = { season?: unknown; matches?: unknown }

function boutsOf(rows: readonly unknown[]): Bout[] {
  return rows.flatMap((row) => {
    try {
      const value = (row as MatchSeasonRow).matches
      return Array.isArray(value) ? value : JSON.parse(String(value ?? "[]"))
    } catch {
      return []
    }
  })
}

export function reportSignificantBouts(input: {
  qualifierBouts: readonly Bout[]
  matchRows: readonly MatchSeasonRow[]
  opponentIndex: OpponentIndex
  /** No middle school seasons or bouts (Matt, 1 October 2026). Omitted, nothing is filtered. */
  graduationYear?: number | null
}): {
  wins: SignificantWin[]
  losses: SignificantWin[]
  /** The latest season's imported bouts, before the in-season filter. */
  latestSeasonBouts: Bout[]
  latestSeasonRows: MatchSeasonRow[]
} {
  const grad = input.graduationYear ?? null
  const matchRows = input.matchRows.filter((r) => isHighSchoolSeason(String(r.season ?? ""), grad, (r as { grade?: unknown }).grade))
  const latestSeasonRows = latestSeasonMatchRows(matchRows as never) as MatchSeasonRow[]
  const latestSeasonBouts = highSchoolBouts(boutsOf(latestSeasonRows) as never[], grad) as Bout[]
  // Event CSVs carry the exact score and are authoritative. RankWrestler also includes some of
  // the same off-season bouts (notably I-64) and States; merging the raw arrays printed and
  // scored those meetings twice.
  const bouts = mergeBoutSources(highSchoolBouts(input.qualifierBouts as never[], grad) as Bout[], latestSeasonBouts)

  /*
   * Plus every earlier-season win over a North Carolina state champion or placer. The current
   * season carries the other reasons; a state finalist beaten as a freshman is still a win a coach
   * should see. Only present when the caller loaded `statePlacers` into the index.
   */
  const latestSet = new Set<unknown>(latestSeasonRows)
  const earlierBouts = highSchoolBouts(boutsOf(matchRows.filter((row) => !latestSet.has(row))) as never[], grad) as Bout[]
  const currentWins = findSignificantWins(bouts, input.opponentIndex)
  const currentWinKeys = new Set(currentWins.map((w) => `${w.opponent.toLowerCase()}|${w.date}`))
  // Accolades only - ranked, nationally ranked, state champion or placer - as on the profile.
  const wins = withAccoladesOnly([
    ...currentWins,
    ...findSignificantWins(earlierBouts, input.opponentIndex, { stateOnly: true }).filter(
      (w) => !currentWinKeys.has(`${w.opponent.toLowerCase()}|${w.date}`),
    ),
  ])
  const losses = withAccoladesOnly(findSignificantLosses(bouts, input.opponentIndex))
  return { wins, losses, latestSeasonBouts, latestSeasonRows }
}

/** Loads the bouts and computes the list, for callers that have not already read them. */
export async function loadReportSignificantWins(
  supabase: SupabaseClient,
  athleteId: string,
  opponentIndex: OpponentIndex,
  graduationYear?: number | null,
): Promise<SignificantWin[]> {
  const [{ data: matchRows }, qualifierBouts] = await Promise.all([
    supabase.from("matches").select("season,matches").eq("athlete_id", athleteId),
    getQualifierSignificantWinBouts(supabase, athleteId, "all").catch(() => [] as Bout[]),
  ])
  return reportSignificantBouts({ qualifierBouts, matchRows: matchRows ?? [], opponentIndex, graduationYear }).wins
}
