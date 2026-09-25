import type { SupabaseClient } from "@supabase/supabase-js"

export type NchsaaStateBout = {
  year: number
  date: string | null
  weight: string | null
  opponent: string
  opponentSchool: string | null
  outcome: "W" | "L"
  method: string | null
  /** Authoritative bracket label when the source or placement path proves it. */
  round?: string | null
  /** Exact Trackwrestling result (for example, 6-5 SV). */
  score?: string | null
}

type MatchHistoryRow = {
  season?: unknown
  matches?: unknown
}

/** State individual championships only — never regionals or the state dual series. */
export function isNchsaaIndividualStateEvent(value: unknown): boolean {
  const venue = String(value ?? "").trim()
  return /NCHSAA\s+State\s+Championships?/i.test(venue) && !/regional|dual/i.test(venue)
}

function eventYear(date: unknown, season: unknown): number | null {
  const dateYear = String(date ?? "").match(/\b(20\d{2})\b/)
  if (dateYear) return Number(dateYear[1])
  const years = [...String(season ?? "").matchAll(/\b(20\d{2}|\d{2})\b/g)]
  const last = years.at(-1)?.[1]
  if (!last) return null
  return Number(last.length === 2 ? `20${last}` : last)
}

export function extractNchsaaStateBouts(rows: MatchHistoryRow[]): NchsaaStateBout[] {
  const found = new Map<string, NchsaaStateBout>()
  for (const row of rows) {
    if (!Array.isArray(row.matches)) continue
    for (const raw of row.matches) {
      if (!raw || typeof raw !== "object") continue
      const bout = raw as Record<string, unknown>
      if (!isNchsaaIndividualStateEvent(bout.venue ?? bout.tournament)) continue
      const year = eventYear(bout.date, row.season)
      const opponent = String(bout.opponent ?? bout.opponent_name ?? "").trim()
      const outcome = String(bout.win_loss ?? bout.result_code ?? "").trim().toUpperCase()
      if (!year || !opponent || (outcome !== "W" && outcome !== "L")) continue
      const parsed: NchsaaStateBout = {
        year,
        date: String(bout.date ?? "").trim() || null,
        weight: String(bout.weight ?? bout.weight_class ?? "").replace(/\s*lbs?$/i, "").trim() || null,
        opponent,
        opponentSchool: String(bout.opponent_school ?? "").trim() || null,
        outcome,
        method: String(bout.result ?? bout.method ?? "").trim() || null,
      }
      const key = [parsed.year, parsed.date, parsed.weight, parsed.opponent.toLowerCase(), parsed.outcome, parsed.method].join("|")
      found.set(key, parsed)
    }
  }
  return [...found.values()].sort((a, b) => b.year - a.year || String(a.date).localeCompare(String(b.date)))
}

export async function getNchsaaStateBoutsForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<NchsaaStateBout[]> {
  if (!athleteId.trim()) return []
  const [historyResponse, csvResponse] = await Promise.all([
    supabase.from("matches").select("season,matches").eq("athlete_id", athleteId),
    supabase
      .from("other_tournament_bouts")
      .select("year,event_date,weight_class,round,bout_order,opponent_name,opponent_club,win,win_type,score")
      .eq("athlete_id", athleteId)
      .like("event_key", "nchsaa-states-%")
      .order("year", { ascending: false })
      .order("bout_order", { ascending: true }),
  ])

  const history = historyResponse.error || !historyResponse.data
    ? []
    : extractNchsaaStateBouts(historyResponse.data)
  if (csvResponse.error || !csvResponse.data?.length) return history

  const authoritative = csvResponse.data.flatMap((row): NchsaaStateBout[] => {
    const opponent = String(row.opponent_name ?? "").trim()
    const year = Number(row.year)
    if (!opponent || !Number.isFinite(year)) return []
    return [{
      year,
      date: String(row.event_date ?? "").trim() || null,
      weight: String(row.weight_class ?? "").trim() || null,
      opponent,
      opponentSchool: String(row.opponent_club ?? "").trim() || null,
      outcome: row.win ? "W" : "L",
      method: String(row.win_type ?? "").trim() || null,
      round: String(row.round ?? "").replace(/\s*·\s*Bout\s+\d+$/i, "").trim() || null,
      score: String(row.score ?? "").trim() || null,
    }]
  })
  const authoritativeYears = new Set(authoritative.map((bout) => bout.year))
  return [...authoritative, ...history.filter((bout) => !authoritativeYears.has(bout.year))]
}
