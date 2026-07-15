/**
 * Display rank for leaderboard / Data Dawg.
 * Ties use competition ranking with a T prefix (e.g. T9, T154).
 */
export function formatTiedRank(rank: number, isTied: boolean): string {
  const n = Math.floor(Number(rank))
  if (!Number.isFinite(n) || n < 1) return String(rank ?? "")
  return isTied ? `T${n}` : String(n)
}

/** Build a short natural-language blurb for search / Data Dawg context. */
export function formatSingleSeasonWinsBlurb(row: {
  wrestler_name: string
  school: string
  wins: number
  losses: number
  year: string
  rank_numeric: number
  is_tied?: boolean | null
  rank_position?: string | null
}): string {
  const rankLabel =
    row.rank_position?.trim() ||
    formatTiedRank(row.rank_numeric, Boolean(row.is_tied))
  return (
    `${row.wrestler_name} of ${row.school} recorded ${row.wins} wins and ${row.losses} losses ` +
    `during the ${row.year} season. He ranks ${rankLabel} in the NCHSAA Wrestling Most Victories ` +
    `single-season historical list.`
  )
}
