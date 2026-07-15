import { formatSingleSeasonWinsBlurb, formatTiedRank } from "@/lib/historical-wins/display"

/** Enrich single-season rows for Data Dawg tool responses. */
export function enrichSingleSeasonWinningestRows(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map((r) => {
    const wrestler_name = String(r.wrestler_name ?? "")
    const school = String(r.school ?? "")
    const wins = Number(r.wins ?? 0)
    const losses = Number(r.losses ?? 0)
    const year = String(r.year ?? "")
    const rank_numeric = Number(r.rank_numeric ?? 0)
    const is_tied = Boolean(r.is_tied)
    const rank_position =
      String(r.rank_position ?? "").trim() || formatTiedRank(rank_numeric, is_tied)
    return {
      ...r,
      rank_position,
      is_tied,
      context: formatSingleSeasonWinsBlurb({
        wrestler_name,
        school,
        wins,
        losses,
        year,
        rank_numeric,
        is_tied,
        rank_position,
      }),
    }
  })
}

/** Parse min wins from queries like "60 or more wins", "at least 60". */
export function parseMinWinsFromQuery(query: string): number | null {
  const q = query.toLowerCase()
  const m =
    q.match(/(?:at\s+least|>=|≥)\s*(\d{2,3})\s*wins?/) ||
    q.match(/(\d{2,3})\s*or\s+more\s+wins?/) ||
    q.match(/(\d{2,3})\+?\s*wins?/) ||
    q.match(/wins?\s*(?:of\s+)?(?:at\s+least\s+)?(\d{2,3})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Parse season YYYY-YYYY from a free-text query. */
export function parseSeasonFromQuery(query: string): string | null {
  const m = query.match(/\b(20\d{2}|19\d{2})\s*[-–/]\s*(20\d{2}|19\d{2})\b/)
  if (!m) return null
  const start = Number(m[1])
  const end = Number(m[2])
  if (end !== start + 1) return null
  return `${start}-${end}`
}
