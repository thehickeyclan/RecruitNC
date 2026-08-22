/**
 * Scoring for the Tournament of Champions bracket pool.
 *
 * Deliberately pure: picks in, points out, no database. Everything about this is easy to get
 * subtly wrong and expensive to discover on tournament day, so it is tested rather than trusted.
 *
 * The pool runs on the *official locked draw*, not on a projection. A wrestler seeding the bracket
 * themselves produces a different set of bouts, and picks made against those bouts cannot be
 * compared to anyone else's or to what actually happened.
 */

/**
 * Points by round.
 *
 * Flat scoring would decide the pool on day one: an eight-person double-elimination bracket is
 * mostly early bouts, so whoever cleans up on favourites could not be caught and the finals — the
 * part everyone is watching — would settle nothing. Later rounds are worth more for the same
 * reason March Madness does it.
 *
 * Consolation is worth less than the championship side at the same stage. Placing matters; it
 * does not matter as much as winning the thing.
 */
export const POOL_POINTS_BY_ROUND: Record<string, number> = {
  // Championship side
  "Round of 16": 1,
  "Round 1": 1,
  Quarterfinals: 2,
  "Winners semifinals": 4,
  Championship: 8,

  // Consolation side
  "Consolation R1": 1,
  "Consolation R2": 1,
  "Consolation R3": 1,
  "Consolation semifinals": 2,
  "3rd place": 4,
}

/** Unknown round labels score 1 rather than 0 — a new label should undervalue a bout, not void it. */
export function pointsForRound(roundLabel: string | null | undefined): number {
  const label = String(roundLabel ?? "").trim()
  return POOL_POINTS_BY_ROUND[label] ?? 1
}

export type PoolBout = {
  boutNumber: number
  roundLabel: string
}

/** Bout number → the athlete the entrant picked to win it. */
export type PoolPicks = Record<number, string | null | undefined>

/** Bout number → the athlete who actually won. Absent means the bout has not been decided yet. */
export type PoolResults = Record<number, string | null | undefined>

export type PoolScore = {
  points: number
  /** Bouts the entrant got right. */
  correct: number
  /** Bouts decided so far that the entrant made a pick for — the denominator people expect. */
  decidedPicked: number
  /** Every bout with a result, whether or not this entrant picked it. */
  decided: number
}

/**
 * Score one entry.
 *
 * A pick scores only when it names the wrestler who actually won that bout. Picking someone who
 * never wrestled in it scores nothing, which is the same outcome as picking the loser — so there
 * is no need to model "your wrestler was eliminated earlier". One wrong call costs the points for
 * that bout, not for every bout downstream of it.
 */
export function scoreEntry(bouts: PoolBout[], picks: PoolPicks, results: PoolResults): PoolScore {
  let points = 0
  let correct = 0
  let decidedPicked = 0
  let decided = 0

  for (const bout of bouts) {
    const winner = results[bout.boutNumber]
    if (!winner) continue
    decided++

    const pick = picks[bout.boutNumber]
    if (!pick) continue
    decidedPicked++

    if (pick === winner) {
      correct++
      points += pointsForRound(bout.roundLabel)
    }
  }

  return { points, correct, decidedPicked, decided }
}

/** The most an entry could still finish on, given what has already been decided. */
export function maxRemaining(bouts: PoolBout[], results: PoolResults): number {
  return bouts
    .filter((bout) => !results[bout.boutNumber])
    .reduce((total, bout) => total + pointsForRound(bout.roundLabel), 0)
}
