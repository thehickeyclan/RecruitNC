/**
 * How strong a significant win is, for the profile's "Top 5" (Matt, 26 October 2026).
 *
 * The list itself stays newest first; Top 5 is a second view. The order Matt set:
 *   1. Nationally ranked opponents first, by rank (#13 beats #24).
 *   2. Then the opponent's best credential. An NHSCA All-American sits with state champions -
 *      Jacob Perry's Top 5 is Eversman (#24 SI), a two-time-placer GA champion, then the NHSCA
 *      8th, then single-title champions. A PA/NJ/NY-strength state counts more, the smallest
 *      states less. Several credentials and repeat state placings add a little.
 *   3. Only wins from the last 12 months.
 *
 * Scored from the credential line the profile already prints, so the two can never disagree.
 * The Best 3 pick of 16 October ranked by credential type and was pulled ("a weak top 3"); this
 * one weighs place, state and recency instead.
 */

const STRONG_STATES = new Set(["PA", "NJ", "NY", "OH", "IA", "IL", "MN", "MI", "CA"])
const SMALL_STATES = new Set(["NH", "CT", "RI", "VT", "ME", "DE", "WV", "AL", "MS", "LA", "AR", "NM", "NV", "HI", "AK", "MT", "WY", "DC"])
const STATE_PLACE: Record<number, number> = { 1: 60, 2: 52, 3: 47, 4: 43, 5: 38, 6: 35, 7: 32, 8: 30 }
const YEAR_MS = 365 * 86_400_000

function stateWeight(state: string): number {
  if (STRONG_STATES.has(state)) return 1.25
  if (SMALL_STATES.has(state)) return 0.8
  return 1
}

/** A score for the opponent's credentials; 0 when nothing on the line is recognised. */
export function winStrength(credential: string | null | undefined, nowYear = new Date().getFullYear()): number {
  const c = credential ?? ""
  const parts: number[] = []
  const older = (year: number) => (year < nowYear ? 0.9 : 1)

  for (const m of c.matchAll(/#(\d+)\s+(?:Sports Illustrated|MatScouts|FloWrestling|Flo|InterMat|SI)\b/g)) {
    parts.push(130 - Math.min(Number(m[1]), 40))
  }
  for (const m of c.matchAll(/(\d{4}) NHSCA (?:Champion|All-American \((\d)\w\w)/g)) {
    const place = m[2] ? Number(m[2]) : 1
    parts.push((89 - 4 * (place - 1)) * older(Number(m[1])))
  }
  for (const m of c.matchAll(/(\d)x NHSCA All-American/g)) parts.push(80 + 2 * Number(m[1]))
  for (const m of c.matchAll(/(\d{4}) Super 32 (\d)\w\w/g)) {
    parts.push((92 - 5 * (Number(m[2]) - 1)) * older(Number(m[1])))
  }
  if (/Fargo All-American/.test(c)) parts.push(70)
  for (const m of c.matchAll(/(?:(\d{4}) )?(NCHSAA|NCISA|[A-Z]{2})\b[^·]*?State (Champion\b|Runner-up|(\d)\w\w)/g)) {
    const year = m[1] ? Number(m[1]) : nowYear
    const state = m[2] === "NCHSAA" || m[2] === "NCISA" ? "NC" : m[2]!
    const place = m[3] === "Champion" ? 1 : m[3] === "Runner-up" ? 2 : Number(m[4])
    parts.push((STATE_PLACE[place] ?? 28) * stateWeight(state) * (year < nowYear - 1 ? 0.92 : 1))
  }
  const multiTitle = c.match(/(\d)x State Champion \((\d{4}) ([A-Z]{2}|NCHSAA)/)
  if (multiTitle) parts.push((60 + 4 * Number(multiTitle[1])) * stateWeight(multiTitle[3] === "NCHSAA" ? "NC" : multiTitle[3]!))
  if (!parts.length) return 0

  // A repeat state placer ("2x GA State Placer") is a little stronger than one finish.
  const repeat = c.match(/(\d)x (?:[A-Z]{2} )?State Placer/)
  const repeatBonus = repeat && Number(repeat[1]) >= 2 ? 3 : 0
  parts.sort((a, b) => b - a)
  return Math.round((parts[0]! + Math.min(parts.length - 1, 3) * 2 + repeatBonus) * 10) / 10
}

/** "2026-10-24", "1/10/2026", "12/20 - 12/21/2024" (the last day). NaN when there is no date. */
export function winDate(date: string | null | undefined): number {
  const s = String(date ?? "").trim()
  if (!s) return Number.NaN
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const us = [...s.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)].pop()
  if (us) return Date.UTC(Number(us[3]), Number(us[1]) - 1, Number(us[2]))
  return Number.NaN
}

type ScorableWin = { opponent: string; credential?: string | null; date?: string | null }

/** Newest first; undated wins last, in their original order. */
export function newestFirst<T extends ScorableWin>(wins: readonly T[]): T[] {
  return wins
    .map((w, i) => ({ w, i, t: winDate(w.date) }))
    .sort((x, y) => (Number.isNaN(x.t) ? 1 : 0) - (Number.isNaN(y.t) ? 1 : 0) || (y.t || 0) - (x.t || 0) || x.i - y.i)
    .map(({ w }) => w)
}

/** The strongest wins of the last 12 months, one per opponent. */
export function topWins<T extends ScorableWin>(wins: readonly T[], now = Date.now(), count = 5): T[] {
  const nowYear = new Date(now).getUTCFullYear()
  const best = new Map<string, { w: T; score: number; t: number }>()
  for (const w of wins) {
    const t = winDate(w.date)
    if (Number.isNaN(t) || now - t > YEAR_MS) continue
    const score = winStrength(w.credential, nowYear)
    if (score <= 0) continue
    const key = w.opponent.trim().toLowerCase()
    const kept = best.get(key)
    if (!kept || score > kept.score || (score === kept.score && t > kept.t)) best.set(key, { w, score, t })
  }
  return [...best.values()].sort((a, b) => b.score - a.score || b.t - a.t).slice(0, count).map((x) => x.w)
}
