/**
 * National rankings from outside outlets, and the rule they gate.
 *
 * Five stars means an independent national outlet ranks the wrestler. Not a score we
 * computed, not a projection we made — a claim someone else published that we can point at.
 * That is the whole reason the top band is defensible: a parent asking "why is my son not a
 * 5" gets "Flo, SI and MatScouts have not ranked him", not an argument about our maths.
 *
 * Three editions are retained. A ranking is a statement about a wrestler now; a two-year-old
 * one says nothing about who they are today, and keeping an archive of stale placements on
 * minors earns nothing. `prune_national_rankings()` enforces that in the database.
 */

import type { SupabaseClient } from "@supabase/supabase-js"

/** The outlets Matt supplies monthly. */
export const NATIONAL_RANKING_SOURCES = {
  flowrestling: "FloWrestling",
  sports_illustrated: "Sports Illustrated",
  matscouts: "MatScouts",
} as const

export type NationalRankingSource = keyof typeof NATIONAL_RANKING_SOURCES

/** How many monthly editions are kept. Mirrors prune_national_rankings(). */
export const RETAINED_EDITIONS = 3

export type NationalRanking = {
  source: NationalRankingSource | string
  sourceLabel: string
  rankingMonth: string
  rank: number
  scope: string
  weightClass: string | null
  classYear: number | null
  sourceUrl: string | null
}

export function sourceLabel(source: string): string {
  return NATIONAL_RANKING_SOURCES[source as NationalRankingSource] ?? source
}

/**
 * What a rank is a rank OF — and for a big board, that has to include the weight.
 *
 * A big board's ranks restart inside each weight group: MatScouts' 2027 girls board holds fifteen
 * wrestlers ranked #1, one per group. "National #1 · MatScouts" is then not a strong claim about a
 * recruit, it is no claim at all, so the weight travels with the number everywhere it is shown.
 *
 * Pound-for-pound ranks ARE one list, so they need the label but no weight. A weight list already
 * names its weight elsewhere on the row.
 */
export function rankingScopeLabel(ranking: { scope: string; weightClass: string | null }): string {
  if (ranking.scope === "p4p") return " P4P"
  if (ranking.scope === "big_board") {
    return ranking.weightClass ? ` Big Board (${ranking.weightClass})` : " Big Board"
  }
  return ""
}

function toRanking(row: Record<string, unknown>): NationalRanking {
  return {
    source: String(row.source ?? ""),
    sourceLabel: sourceLabel(String(row.source ?? "")),
    rankingMonth: String(row.ranking_month ?? ""),
    rank: Number(row.rank ?? 0),
    scope: String(row.scope ?? "weight"),
    weightClass: (row.weight_class as string) ?? null,
    classYear: row.class_year == null ? null : Number(row.class_year),
    sourceUrl: (row.source_url as string) ?? null,
  }
}

/**
 * Every retained national ranking for one athlete, best rank first.
 *
 * Matched on `athlete_id`, which the import resolves. A row that could not be resolved to a
 * profile stays in the table as part of the edition but gates nobody's star — crediting a
 * ranking to the wrong wrestler is worse than missing one.
 */
export async function getNationalRankingsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<NationalRanking[]> {
  if (!athleteId?.trim()) return []
  const { data, error } = await supabase
    .from("national_rankings")
    .select("source, ranking_month, rank, scope, weight_class, class_year, source_url")
    .eq("athlete_id", athleteId)
    .order("rank", { ascending: true })
  if (error || !data) return []
  return data.map(toRanking)
}

/** Athlete ids carrying at least one retained national ranking — for a board or a batch. */
export async function loadNationallyRankedIds(supabase: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>()
  const { data } = await supabase.from("national_rankings").select("athlete_id").not("athlete_id", "is", null)
  for (const row of data ?? []) {
    if (row.athlete_id) ids.add(String(row.athlete_id))
  }
  return ids
}

/**
 * The 5-star gate.
 *
 * Deliberately a single named function rather than an inline check: this is the one rule the
 * rating hangs on, and it should be obvious where to change it if the policy ever moves.
 */
export function isNationallyRanked(rankings: ReadonlyArray<NationalRanking>): boolean {
  return rankings.length > 0
}

/** The best rank across outlets, for display next to the star. */
export function bestNationalRanking(
  rankings: ReadonlyArray<NationalRanking>,
): NationalRanking | null {
  if (rankings.length === 0) return null
  return [...rankings].sort((a, b) => a.rank - b.rank)[0]!
}

/** "#12 FloWrestling · #18 MatScouts" — every outlet that ranks them, best first. */
export function nationalRankingSummary(rankings: ReadonlyArray<NationalRanking>): string {
  const bySource = new Map<string, NationalRanking>()
  for (const ranking of [...rankings].sort((a, b) => a.rank - b.rank)) {
    if (!bySource.has(ranking.source)) bySource.set(ranking.source, ranking)
  }
  return [...bySource.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((r) => `#${r.rank} ${r.sourceLabel}`)
    .join(" · ")
}

/** One outlet's run of rankings, newest edition first. */
export type NationalRankingSeries = {
  source: string
  sourceLabel: string
  /** Newest edition first. */
  editions: NationalRanking[]
  /** The most recent rank. */
  current: number
  /** Places gained since the oldest retained edition: positive is a climb. Null on one edition. */
  movement: number | null
}

/** Editions newest first, then best rank — the order a history reads in. */
function byRecency(a: NationalRanking, b: NationalRanking): number {
  return b.rankingMonth.localeCompare(a.rankingMonth) || a.rank - b.rank
}

/**
 * A ranking history, grouped by outlet.
 *
 * Grouped rather than merged because outlets disagree, sometimes sharply, and averaging them
 * would invent a number nobody published. A coach reads "#12 Flo, #24 MatScouts" as the
 * disagreement it is.
 *
 * Movement is measured against the oldest edition still retained, so it only ever describes
 * the window we actually hold — see `RETAINED_EDITIONS`. A rise from #30 to #12 two years ago
 * is not something this can claim, and should not be.
 */
export function nationalRankingHistory(
  rankings: ReadonlyArray<NationalRanking>,
): NationalRankingSeries[] {
  /*
   * Grouped by source AND list type. A weight ranking and a big-board ranking from one outlet are
   * two different rankings — merging them made a #1 at 125 on the board and a #40 on the weight
   * list look like one wrestler climbing 39 places.
   */
  const bySource = new Map<string, NationalRanking[]>()
  for (const ranking of rankings) {
    const key = `${ranking.source}|${ranking.scope}`
    const existing = bySource.get(key)
    if (existing) existing.push(ranking)
    else bySource.set(key, [ranking])
  }

  const series: NationalRankingSeries[] = []
  for (const [key, rows] of bySource) {
    const source = key.split("|")[0]!
    const editions = [...rows].sort(byRecency)
    const current = editions[0]!
    const oldest = editions[editions.length - 1]!
    series.push({
      source,
      sourceLabel: `${current.sourceLabel}${rankingScopeLabel(current)}`,
      editions,
      current: current.rank,
      // Ranks count downward, so an improvement is the old number minus the new one.
      movement: editions.length > 1 ? oldest.rank - current.rank : null,
    })
  }
  return series.sort((a, b) => a.current - b.current)
}

/** How many distinct monthly editions a history spans. */
export function editionsSpanned(rankings: ReadonlyArray<NationalRanking>): number {
  return new Set(rankings.map((r) => r.rankingMonth)).size
}
