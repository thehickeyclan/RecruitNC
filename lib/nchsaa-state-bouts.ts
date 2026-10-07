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

/**
 * State individual championships only — never regionals or the state dual series.
 *
 * The girls' tournament is "NCHSAA Women`s State Championship" (backtick and all), and the
 * Trackwrestling import labels some rows "2026 NCHSAA (NC) State Championships". Neither matched,
 * so no girl's state bouts reached her profile: Rylynn Keziah had seven on file and showed none.
 */
export function isNchsaaIndividualStateEvent(value: unknown): boolean {
  const venue = String(value ?? "").trim()
  return (
    /NCHSAA\s+(?:\(NC\)\s+)?(?:(?:Women|Girls)[`'’]?s?\s+)?State\s+Championships?/i.test(venue) &&
    !/regional|dual/i.test(venue)
  )
}

/** Milliseconds for "2/21/2026" or "2026-02-21"; null when the date carries no year. */
function dateValue(value: unknown): number | null {
  const text = String(value ?? "").trim()
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) return Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2]))
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  return null
}

/**
 * The season's matches, oldest first.
 *
 * RankWrestler lists a season newest first, and a one-day state tournament puts every bout on the
 * same date, so sorting by date alone left the final at the top. Round labels are assigned from
 * the last bout backwards, which then called a first-round pin the Finals. A season whose dates
 * run downhill is read in reverse; one that already runs uphill, or carries no full dates, is
 * left as written.
 */
function chronological(matches: unknown[]): unknown[] {
  const dates = matches
    .map((m) => (m && typeof m === "object" ? dateValue((m as Record<string, unknown>).date) : null))
    .filter((d): d is number => d !== null)
  if (dates.length < 2) return matches
  return dates[0]! > dates[dates.length - 1]! ? [...matches].reverse() : matches
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
    for (const raw of chronological(row.matches)) {
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
