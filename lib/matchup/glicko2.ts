/**
 * Glicko-2 (Glickman, "Example of the Glicko-2 system", 2013), one rating period per event.
 *
 * Chosen over Elo because the rating deviation (RD) says how much we actually know: a wrestler
 * with four bouts on file carries a wide RD, and every probability involving him is pulled
 * toward 50%. That is the "not enough data" answer stated as a number rather than hidden.
 *
 * Private research code. Nothing here is read by a page or an API; see
 * docs/matchup-backtest-2026.md before wiring any of it to a surface.
 */

const SCALE = 173.7178
const PI2 = Math.PI * Math.PI

export type Rating = {
  /** Glicko scale, 1500 centred. */
  rating: number
  /** Rating deviation, Glicko scale. 350 = nothing known. */
  rd: number
  volatility: number
  /** ISO date of the last event this rating was updated at. */
  lastDate: string | null
  /** Contested bouts that have gone into this rating. */
  bouts: number
}

export type GlickoParams = {
  initialRating: number
  initialRd: number
  initialVolatility: number
  /** System constant τ — how fast volatility may move. Glickman suggests 0.3-1.2. */
  tau: number
  /**
   * RD growth per day without a bout, Glicko-1 style: rd² += c²·days. A wrestler who sat out
   * a year is less known than one who wrestled last month, whatever his record.
   */
  rdPerDay: number
  /**
   * Extra RD added (in quadrature) each time a 1 June passes — the day a high schooler moves
   * up a grade (lib/high-school-window.ts). Kids grow over the off-season; a rating carried
   * across it should be held less firmly.
   */
  offSeasonRd: number
  maxRd: number
}

export const DEFAULT_GLICKO: GlickoParams = {
  initialRating: 1500,
  initialRd: 350,
  initialVolatility: 0.06,
  tau: 0.5,
  rdPerDay: 3,
  offSeasonRd: 50,
  maxRd: 350,
}

export function newRating(p: GlickoParams = DEFAULT_GLICKO): Rating {
  return { rating: p.initialRating, rd: p.initialRd, volatility: p.initialVolatility, lastDate: null, bouts: 0 }
}

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / PI2)
const expected = (mu: number, muJ: number, phiJ: number) => 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)))

function daysBetween(a: string, b: string): number {
  return Math.max(0, (Date.parse(b) - Date.parse(a)) / 86_400_000)
}

/** How many 1 Junes fall in (from, to]. */
export function junesCrossed(from: string, to: string): number {
  const fy = Number(from.slice(0, 4))
  const ty = Number(to.slice(0, 4))
  let n = 0
  for (let y = fy; y <= ty; y++) {
    const june = `${y}-06-01`
    if (june > from && june <= to) n++
  }
  return n
}

/** The RD a rating carries on `date`, after time away. Pure — the stored rating is untouched. */
export function rdAt(r: Rating, date: string, p: GlickoParams = DEFAULT_GLICKO): number {
  if (!r.lastDate || date <= r.lastDate) return r.rd
  const days = daysBetween(r.lastDate, date)
  const junes = junesCrossed(r.lastDate, date)
  const v = r.rd * r.rd + p.rdPerDay * p.rdPerDay * days + junes * p.offSeasonRd * p.offSeasonRd
  return Math.min(p.maxRd, Math.sqrt(v))
}

/**
 * Probability that A beats B. Both RDs widen the curve (Glickman's combined-deviation form), so
 * two barely-known wrestlers come out near 50% however far apart their point ratings sit.
 */
export function winProbability(a: Rating, b: Rating, date: string, p: GlickoParams = DEFAULT_GLICKO): number {
  const phiA = rdAt(a, date, p) / SCALE
  const phiB = rdAt(b, date, p) / SCALE
  const mu = (a.rating - b.rating) / SCALE
  return 1 / (1 + Math.exp(-g(Math.sqrt(phiA * phiA + phiB * phiB)) * mu))
}

export type PeriodResult = { opponent: Rating; score: 0 | 1 }

/**
 * One Glicko-2 rating period for one wrestler: every bout he had at the event, scored against
 * the opponents' ratings as they stood when the event began. `player.rd` must already be the
 * inflated pre-event RD (see rdAt); opponents' RDs likewise.
 */
export function updateRating(
  player: Rating,
  results: PeriodResult[],
  date: string,
  p: GlickoParams = DEFAULT_GLICKO,
): Rating {
  const mu = (player.rating - 1500) / SCALE
  const phi = rdAt(player, date, p) / SCALE
  const sigma = player.volatility
  if (!results.length) return { ...player, rd: phi * SCALE }

  let vInv = 0
  let deltaSum = 0
  for (const { opponent, score } of results) {
    const muJ = (opponent.rating - 1500) / SCALE
    const phiJ = rdAt(opponent, date, p) / SCALE
    const e = expected(mu, muJ, phiJ)
    const gj = g(phiJ)
    vInv += gj * gj * e * (1 - e)
    deltaSum += gj * (score - e)
  }
  const v = 1 / vInv
  const delta = v * deltaSum

  // Step 5: new volatility by the Illinois algorithm.
  const a = Math.log(sigma * sigma)
  const tau2 = p.tau * p.tau
  const f = (x: number) => {
    const ex = Math.exp(x)
    const d = phi * phi + v + ex
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * d * d) - (x - a) / tau2
  }
  let A = a
  let B: number
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v)
  } else {
    let k = 1
    while (f(a - k * p.tau) < 0) k++
    B = a - k * p.tau
  }
  let fA = f(A)
  let fB = f(B)
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA /= 2
    }
    B = C
    fB = fC
  }
  const sigmaNew = Math.exp(A / 2)

  const phiStar = Math.sqrt(phi * phi + sigmaNew * sigmaNew)
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  const muNew = mu + phiNew * phiNew * deltaSum

  return {
    rating: muNew * SCALE + 1500,
    rd: Math.min(p.maxRd, phiNew * SCALE),
    volatility: sigmaNew,
    lastDate: date,
    bouts: player.bouts + results.length,
  }
}
