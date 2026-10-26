/**
 * Plain Elo — the baseline Glicko-2 has to beat. No deviation, no time decay: every wrestler is
 * as well known after one bout as after forty, which is exactly the weakness being measured.
 */

export type EloParams = { initial: number; k: number }

export const DEFAULT_ELO: EloParams = { initial: 1500, k: 32 }

export function eloExpected(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400))
}

/**
 * One event as a single period: every bout is scored on pre-event ratings and the changes are
 * summed, so a wrestler's third bout of the day is not predicted from his first two.
 */
export function eloPeriod(
  ratings: Map<string, number>,
  bouts: Array<{ winner: string; loser: string }>,
  p: EloParams = DEFAULT_ELO,
): Map<string, number> {
  const delta = new Map<string, number>()
  const get = (k: string) => ratings.get(k) ?? p.initial
  for (const b of bouts) {
    const e = eloExpected(get(b.winner), get(b.loser))
    const d = p.k * (1 - e)
    delta.set(b.winner, (delta.get(b.winner) ?? 0) + d)
    delta.set(b.loser, (delta.get(b.loser) ?? 0) - d)
  }
  for (const [k, d] of delta) ratings.set(k, get(k) + d)
  return ratings
}
