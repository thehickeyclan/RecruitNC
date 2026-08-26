import { compareTiebreak, type TiebreakTotals } from "@/lib/toc/final-prediction"

/**
 * The order the leaderboard puts people in.
 *
 * Extracted from the route so the cascade can be tested. It decides who wins the pool, and an
 * inline sort inside an endpoint that also does database work is not something anyone can check.
 */

export type StandingInput = {
  name: string
  points: number
  correct: number
  weightsEntered: number
  tiebreak: TiebreakTotals
}

export type Standing = Omit<StandingInput, "tiebreak"> & {
  rank: number
  finalsCalled: number
}

/**
 * Points first. Then correct picks, which separates someone who scored on the late rounds from
 * someone who scored the same total on volume. Then the finals tiebreaker. Name last, only so
 * that a genuine dead heat is at least stable rather than arbitrary between reloads.
 *
 * Ranks are dense on purpose: two entrants who cannot be separated share a rank, and the next
 * one takes the number after the tie. Showing one of them as second when nothing distinguishes
 * them would be inventing a result.
 */
export function rankStandings(rows: StandingInput[]): Standing[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.correct - a.correct ||
      compareTiebreak(a.tiebreak, b.tiebreak) ||
      a.name.localeCompare(b.name),
  )

  const tiedWithPrevious = (a: StandingInput, b: StandingInput) =>
    a.points === b.points && a.correct === b.correct && compareTiebreak(a.tiebreak, b.tiebreak) === 0

  let rank = 0
  return sorted.map((row, index) => {
    if (index === 0 || !tiedWithPrevious(sorted[index - 1], row)) rank = index + 1
    const { tiebreak, ...rest } = row
    return { rank, ...rest, finalsCalled: tiebreak.methodsCorrect }
  })
}
