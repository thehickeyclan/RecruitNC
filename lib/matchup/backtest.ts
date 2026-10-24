/**
 * Walking the bouts in date order, predicting each event from what was known before it.
 *
 * An event is one rating period for both models. Every bout at an event is predicted from the
 * ratings as they stood the morning it began, and only then is the event rated — so nothing a
 * wrestler did in round one leaks into the prediction for his semifinal.
 */
import { eventTier, type Bout, type EventTier } from "./bouts"
import { DEFAULT_ELO, eloExpected, eloPeriod, type EloParams } from "./elo"
import { DEFAULT_GLICKO, newRating, rdAt, updateRating, winProbability, type GlickoParams, type PeriodResult, type Rating } from "./glicko2"

export type ScoredBout = {
  bout: Bout
  /** Glicko-2 probability the actual winner wins. */
  glicko: number
  /** Elo probability the actual winner wins. */
  elo: number
  /** Contested bouts on file before the event, winner and loser. */
  priorWinner: number
  priorLoser: number
  rdWinner: number
  rdLoser: number
}

export type BacktestOptions = {
  glicko?: GlickoParams
  elo?: EloParams
  /** Whether an event's results go into the ratings. False = frozen (the static test). */
  updateIf?: (date: string, eventKey: string) => boolean
  /** Which bouts to score. */
  predictIf?: (b: Bout) => boolean
  /**
   * Starting rating offset (both models) by the tier of the event a wrestler is first seen at.
   * Without it a state-tournament newcomer starts level with a national entrant and is made
   * favourite over a kid who lost twice at NHSCA — and usually loses (NCHSAA 2026, first run).
   */
  debutOffset?: Partial<Record<EventTier, number>>
}

export type BacktestState = { glicko: Map<string, Rating>; elo: Map<string, number> }

export function periods(bouts: Bout[]): Bout[][] {
  const by = new Map<string, Bout[]>()
  for (const b of bouts) {
    if (!b.winner.key || !b.loser.key) continue
    const k = `${b.date}|${b.eventKey}`
    if (!by.has(k)) by.set(k, [])
    by.get(k)!.push(b)
  }
  return [...by.keys()].sort().map((k) => by.get(k)!)
}

export function runBacktest(bouts: Bout[], opts: BacktestOptions = {}): { scored: ScoredBout[]; state: BacktestState } {
  const gp = opts.glicko ?? DEFAULT_GLICKO
  const ep = opts.elo ?? DEFAULT_ELO
  const updateIf = opts.updateIf ?? (() => true)
  const predictIf = opts.predictIf ?? (() => false)
  const glicko = new Map<string, Rating>()
  const elo = new Map<string, number>()
  const scored: ScoredBout[] = []
  const getG = (k: string) => glicko.get(k)!
  /* Debut ratings depend only on the kind of event, never its result — creating them early leaks nothing. */
  const debut = (k: string, b: Bout) => {
    if (glicko.has(k)) return
    const off = opts.debutOffset?.[eventTier(b.eventKey)] ?? 0
    glicko.set(k, { ...newRating(gp), rating: gp.initialRating + off })
    elo.set(k, ep.initial + off)
  }

  for (const period of periods(bouts)) {
    const date = period[0].date
    for (const b of period) { debut(b.winner.key, b); debut(b.loser.key, b) }
    for (const b of period) {
      if (!predictIf(b)) continue
      const w = getG(b.winner.key)
      const l = getG(b.loser.key)
      scored.push({
        bout: b,
        glicko: winProbability(w, l, date, gp),
        elo: eloExpected(elo.get(b.winner.key)!, elo.get(b.loser.key)!),
        priorWinner: w.bouts,
        priorLoser: l.bouts,
        rdWinner: rdAt(w, date, gp),
        rdLoser: rdAt(l, date, gp),
      })
    }
    if (!updateIf(date, period[0].eventKey)) continue

    const results = new Map<string, PeriodResult[]>()
    for (const b of period) {
      const w = getG(b.winner.key)
      const l = getG(b.loser.key)
      if (!results.has(b.winner.key)) results.set(b.winner.key, [])
      if (!results.has(b.loser.key)) results.set(b.loser.key, [])
      results.get(b.winner.key)!.push({ opponent: l, score: 1 })
      results.get(b.loser.key)!.push({ opponent: w, score: 0 })
    }
    const next = new Map<string, Rating>()
    for (const [k, res] of results) next.set(k, updateRating(getG(k), res, date, gp))
    for (const [k, r] of next) glicko.set(k, r)
    eloPeriod(elo, period.map((b) => ({ winner: b.winner.key, loser: b.loser.key })), ep)
  }
  return { scored, state: { glicko, elo } }
}
