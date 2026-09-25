/**
 * What a win is worth, by who it was over.
 *
 * The board scored a quality win by which bucket it fell in: 18 over a nationally ranked
 * wrestler, 10 over anyone in the Tournament of Champions field, 7 over a ranked North Carolina
 * prospect. The buckets were checked in that order, so the TOC field swallowed the ranking —
 * Tyton Kostoff's win over Jake Amiott, the #2 in the Class of 2028, scored exactly what his win
 * over Cayden Laws scored, and Laws went 0-2 at that tournament. Two results a coach would never
 * equate, recorded as equal.
 *
 * That is backwards for a board whose whole argument is that wrestlers should seek out the best
 * opposition. So the opponent's ranking is read first where we have it, and the TOC field becomes
 * what it should always have been: the floor for an invitee we have no ranking for, not a ceiling
 * over one we do.
 *
 * Grading is across graduation years on purpose. Beating the #2 of the class below is not a
 * lesser feat than beating the #2 of your own, and at a tournament seeded by weight rather than
 * by year, refusing to count it means refusing to count the hardest matches on the card.
 */
import type { SignificantWin } from "@/lib/significant-wins"

/** A nationally ranked opponent is still the best thing on any résumé. */
export const NATIONAL_RANKED_WIN = 18

/** An opponent we rank, by where we rank them. */
export function rankedOpponentValue(ranking: number): number {
  if (ranking <= 3) return 16
  if (ranking <= 10) return 13
  if (ranking <= 20) return 10
  return 8
}

/** In the TOC field but carrying no ranking of ours. A real field, an unmeasured opponent. */
export const TOC_FIELD_WIN = 9

/** Ranked by somebody, but we could not resolve a number. */
export const UNGRADED_RANKED_WIN = 7

export function rankedWinValue(
  win: Pick<SignificantWin, "reason" | "opponentRanking">,
): number {
  if (win.reason === "national-ranked") return NATIONAL_RANKED_WIN
  const ranking = win.opponentRanking
  if (ranking != null && Number.isFinite(ranking) && ranking > 0) return rankedOpponentValue(ranking)
  return win.reason === "toc-field" ? TOC_FIELD_WIN : UNGRADED_RANKED_WIN
}

/**
 * The most a win column can contribute.
 *
 * Kept as a ceiling so a wrestler with a long season cannot out-score one who travelled, but
 * raised from 70: Kostoff sat at 65 of 70 with three TOC wins and a win over the #3 in the state,
 * which meant his next quality win was worth nothing at all. A cap that binds on the wrestlers
 * the board is trying to reward is set too low.
 */
export const RANKED_WIN_CAP = 80

export function scoreRankedWins(
  wins: ReadonlyArray<Pick<SignificantWin, "reason" | "opponentRanking">>,
): number {
  return Math.min(wins.reduce((sum, win) => sum + rankedWinValue(win), 0), RANKED_WIN_CAP)
}
