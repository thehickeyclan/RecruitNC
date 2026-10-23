/**
 * Scoring a set of bout predictions. Each prediction is stated from the actual winner's side,
 * `p` being the probability the model gave the wrestler who won.
 */

export type Prediction = { p: number }

export type Summary = { n: number; accuracy: number; logLoss: number; brier: number }

const EPS = 1e-6

export function summarize(preds: Prediction[]): Summary {
  const n = preds.length
  if (!n) return { n: 0, accuracy: NaN, logLoss: NaN, brier: NaN }
  let hit = 0
  let ll = 0
  let br = 0
  for (const { p } of preds) {
    /* A 50/50 call is half right, not a coin flip the model gets to win. */
    hit += p > 0.5 ? 1 : p === 0.5 ? 0.5 : 0
    ll += -Math.log(Math.min(1 - EPS, Math.max(EPS, p)))
    br += (1 - p) * (1 - p)
  }
  return { n, accuracy: hit / n, logLoss: ll / n, brier: br / n }
}

export type CalibrationRow = { lo: number; hi: number; n: number; predicted: number; observed: number }

/**
 * Bucketed by the favourite's probability (always ≥ 0.5), so each row reads "when the model
 * said 70-80%, the favourite won X% of the time".
 */
export function calibration(preds: Prediction[], edges = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0001]): CalibrationRow[] {
  const rows: CalibrationRow[] = []
  for (let i = 0; i < edges.length - 1; i++) {
    rows.push({ lo: edges[i], hi: Math.min(1, edges[i + 1]), n: 0, predicted: 0, observed: 0 })
  }
  for (const { p } of preds) {
    const fav = Math.max(p, 1 - p)
    const favWon = p >= 0.5 ? 1 : 0
    const row = rows.find((r, i) => fav >= r.lo && (fav < edges[i + 1]))
    if (!row) continue
    row.n++
    row.predicted += fav
    row.observed += p === 0.5 ? 0.5 : favWon
  }
  for (const r of rows) {
    if (r.n) {
      r.predicted /= r.n
      r.observed /= r.n
    }
  }
  return rows
}

/** Expected calibration error: the n-weighted gap between said and seen. */
export function ece(rows: CalibrationRow[]): number {
  const n = rows.reduce((s, r) => s + r.n, 0)
  if (!n) return NaN
  return rows.reduce((s, r) => s + (r.n / n) * Math.abs(r.predicted - r.observed), 0)
}

/**
 * Sharpen (a > 1) or soften (a < 1) a probability on the log-odds scale. Glicko-2's RD shrinks
 * known matchups toward 50% harder than the results justify; one exponent, fitted on the
 * validation season and never on the test, puts the stated numbers back in line.
 */
export function recalibrate(p: number, a: number): number {
  if (p <= 0 || p >= 1) return p
  return 1 / (1 + Math.pow((1 - p) / p, a))
}

/** The exponent that minimises log loss on these predictions. */
export function fitTemperature(preds: Prediction[], grid = Array.from({ length: 41 }, (_, i) => 0.5 + i * 0.05)): number {
  let best = 1
  let bestLl = Infinity
  for (const a of grid) {
    const ll = summarize(preds.map(({ p }) => ({ p: recalibrate(p, a) }))).logLoss
    if (ll < bestLl) { bestLl = ll; best = a }
  }
  return best
}
