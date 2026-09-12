/**
 * Recorded bout results, shaped for the people watching rather than for scoring.
 *
 * The pool already reads these rows to score picks; this is the other audience. A parent in the
 * stands wants the same three facts a scorer's table has: who won, how, and how long ago that was
 * written down. The last of those matters most — results are typed in by one person walking
 * between mats, so a screen that cannot say when it was last updated looks broken the moment it
 * runs a few bouts behind.
 *
 * Pure, so the rules hold still under test: the winners map the bracket advances on, the outcome
 * detail beside each name, and the freshness line.
 */

export type BoutResultRow = {
  bout_number: number
  winner_athlete_id: string
  method?: string | null
  winner_score?: number | null
  loser_score?: number | null
  recorded_at?: string | null
  updated_at?: string | null
}

export type BoutOutcomeView = {
  method: string | null
  winnerScore: number | null
  loserScore: number | null
}

export type BoutResultsView = {
  /** Bout number to winning athlete id — the shape the bracket advances on. */
  winners: Record<number, string>
  /** How each decided bout ended, for the line beside the winner. */
  outcomes: Record<number, BoutOutcomeView>
  recorded: number
  lastUpdated: string | null
}

/** The most recent write across these rows, whichever timestamp the row carries. */
export function lastRecordedAt(rows: readonly BoutResultRow[]): string | null {
  let latest: string | null = null
  for (const row of rows) {
    for (const stamp of [row.updated_at, row.recorded_at]) {
      if (typeof stamp === "string" && stamp && (latest == null || stamp > latest)) latest = stamp
    }
  }
  return latest
}

export function toBoutResultsView(rows: readonly BoutResultRow[]): BoutResultsView {
  const winners: Record<number, string> = {}
  const outcomes: Record<number, BoutOutcomeView> = {}

  for (const row of rows) {
    const bout = Number(row.bout_number)
    const winner = String(row.winner_athlete_id ?? "").trim()
    // A row without a winner is a row that says nothing; scoring ignores it and so does this.
    if (!Number.isInteger(bout) || !winner) continue
    winners[bout] = winner
    outcomes[bout] = {
      method: typeof row.method === "string" && row.method.trim() ? row.method.trim() : null,
      winnerScore: row.winner_score == null ? null : Number(row.winner_score),
      loserScore: row.loser_score == null ? null : Number(row.loser_score),
    }
  }

  return {
    winners,
    outcomes,
    recorded: Object.keys(winners).length,
    lastUpdated: lastRecordedAt(rows),
  }
}
