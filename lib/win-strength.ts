/**
 * How strong a significant win is, for the profile's "Top 5" (Matt, 26 October 2026).
 *
 * The list itself stays newest first; Top 5 is a second view, over the last 12 months only, one
 * win per opponent. The order:
 *   1. Nationally ranked opponents first, by rank (#13 beats #24).
 *   2. Then the opponent's whole record, scored from the computed results (`recordStrength`, set
 *      on each win as `strength` by lib/significant-wins.ts) - never only the one line the profile
 *      prints, which names a single state finish and the newest three national placings.
 *   3. A state finish counts by place, by state and by DIVISION. A one-bracket state (the NJ
 *      Open, CT Open, Indiana) counts most; then the largest-school division of a multi-division
 *      state; the smallest division least. An Ohio Division III runner-up is not ahead of an NC
 *      8A champion, and NC's 3A and 8A titles are not the same (the first version scored state and
 *      place only and did both - Jake Amiott's Top 5, reviewed 26 Oct).
 *   4. An NHSCA All-American sits with state champions: Jacob Perry's GA 4A champion stays ahead
 *      of his NHSCA 8th (Matt), and an NHSCA 8th sits just behind a top-division NC title.
 *   5. Equal scores go to the newer win, but scores are rarely equal now that division counts.
 *
 * `winStrength` reads a credential line into the same record, for family-added wins we could not
 * match to a result; it is the fallback, not the rule.
 */

const STRONG_STATES = new Set(["PA", "NJ", "NY", "OH", "IA", "IL", "MN", "MI", "CA"])
const SMALL_STATES = new Set(["NH", "CT", "RI", "VT", "ME", "DE", "WV", "AL", "MS", "LA", "AR", "NM", "NV", "HI", "AK", "MT", "WY", "DC"])
const STATE_PLACE: Record<number, number> = { 1: 60, 2: 52, 3: 47, 4: 43, 5: 38, 6: 35, 7: 32, 8: 30 }
const YEAR_MS = 365 * 86_400_000

/**
 * Each state's boys' divisions in the 2026 season (state_tournament_placers), any order: the
 * ladder is read from the labels (`divisionValue`). One-bracket states are absent. Private-school
 * associations (VISAA, SCISA, NCISA, MIAA, MIS, TN DII) sit outside the ladder.
 */
const STATE_DIVISIONS: Record<string, readonly string[]> = {
  AK: ["Division I", "Division II"],
  AL: ["1-5A", "1A-4A", "5A", "6-7A", "6A", "7A"],
  AR: ["4A", "5A", "6A"],
  AZ: ["D1", "D2", "D3", "D4"],
  CO: ["2A", "3A", "4A", "5A"],
  FL: ["1A", "2A", "3A"],
  GA: ["1A", "2A", "3A", "4A", "5A", "6A"],
  IA: ["1A", "2A", "3A"],
  ID: ["3A", "4A", "5A", "6A"],
  IL: ["1A", "2A", "3A"],
  KS: ["3-1A", "4A", "5A", "6A"],
  LA: ["Division 1", "Division 2", "Division 3"],
  MD: ["2A/1A", "4A/3A"],
  ME: ["Class A", "Class B"],
  MI: ["Division 1", "Division 2", "Division 3", "Division 4"],
  MN: ["A", "AA", "AAA"],
  MO: ["1", "2", "3", "4"],
  MT: ["A", "AA", "B/C"],
  ND: ["Class A", "Class B"],
  NE: ["A", "B", "C", "D"],
  NM: ["4A", "5A"],
  NV: ["2A", "3A", "5A"],
  NY: ["D1", "D2"],
  OH: ["Division I", "Division II", "Division III"],
  OK: ["3A", "4A", "5A", "6A"],
  OR: ["2A/1A", "3A", "4A", "5A", "6A"],
  PA: ["AA", "AAA"],
  SC: ["2A/1A", "3A", "4A", "5A"],
  SD: ["Class A", "Class B"],
  TN: ["A", "AA"],
  TX: ["5A", "6A"],
  UT: ["1A", "1A/2A", "2A", "3A", "4A", "5A", "6A"],
  VA: ["1A", "2A", "3A", "4A", "5A", "6A"],
  WA: ["1B/2B", "1A", "2A", "3A", "4A"],
  WI: ["D1", "D2", "D3"],
  WV: ["Division 1", "Division 2"],
  WY: ["2A", "3A", "4A"],
}
/** NCHSAA ran four classes through 2025 and seven boys' brackets from 2026 (1A/2A, 3A-8A). */
const NC_DIVISIONS = (year: number): readonly string[] =>
  year <= 2025 ? ["1A", "2A", "3A", "4A"] : ["1A/2A", "3A", "4A", "5A", "6A", "7A", "8A"]
/** States whose lettered classes run A (largest) down: Nebraska A-D, the Dakotas, Maine. */
const LETTER_CLASS_STATES = new Set(["NE", "ND", "SD", "ME"])
const PRIVATE_ASSOCIATIONS = /^(visaa|scisa|ncisa|miaa|mis|dii)$/

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }

/**
 * Where a division sits on its state's ladder, larger number = larger schools. "all" for a
 * one-bracket tournament, "private" for a private-school association, null when unreadable.
 */
function divisionValue(state: string, label: string | null | undefined): number | "all" | "private" | null {
  const l = String(label ?? "")
    .toLowerCase()
    .replace(/\b(boys|girls|coed)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (!l) return STATE_DIVISIONS[state] || state === "NC" ? null : "all"
  if (/open|all-state|meet of champions|high school|championship/.test(l)) return "all"
  if (PRIVATE_ASSOCIATIONS.test(l)) return "private"
  const division = l.match(/^(?:division|div|d)\s*([ivx]+|\d)$/)
  if (division) return -(ROMAN[division[1]] ?? Number(division[1]))
  const letter = l.match(/^(?:class )?([a-d])$/)
  if (letter && LETTER_CLASS_STATES.has(state)) return -(letter[1].charCodeAt(0) - 97)
  if (/^a+$/.test(l)) return l.length
  if (l === "b/c") return 0
  if (/^\d$/.test(l)) return Number(l)
  const digits = [...l.matchAll(/\d/g)].map((m) => Number(m[0]))
  if (!digits.length) return null
  // "1B/2B" is below "1A" in Washington.
  return /a/.test(l) ? Math.max(...digits) : Math.max(...digits) - 2
}

/**
 * A state finish's weight for its division: 1.1 for a one-bracket state (everyone in one field),
 * 0.92 for the largest-school division, down to 0.70 for the smallest; 0.8 for a private-school
 * association; 0.85 when the division cannot be told.
 */
export function divisionFactor(state: string, classification: string | null | undefined, year: number): number {
  const ladder = state === "NC" ? NC_DIVISIONS(year) : STATE_DIVISIONS[state]
  const value = divisionValue(state, classification)
  if (value === "all") return 1.1
  if (value === "private") return 0.8
  if (value == null || !ladder) return 0.85
  const values = ladder.map((d) => divisionValue(state, d)).filter((v): v is number => typeof v === "number")
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  if (hi === lo) return 1
  const at = Math.min(1, Math.max(0, (value - lo) / (hi - lo)))
  return 0.7 + 0.22 * at
}

function stateWeight(state: string): number {
  if (STRONG_STATES.has(state)) return 1.25
  if (SMALL_STATES.has(state)) return 0.8
  return 1
}

/** Everything on file that makes an opponent a strong win: the inputs to `recordStrength`. */
export type OpponentRecord = {
  nationalRank?: number | null
  stateFinishes?: readonly { year: number; place: number | null; classification?: string | null; state?: string | null }[]
  /** NHSCA, Super 32, Beast of the East, Ironman, Journeymen. */
  eventFinishes?: readonly { event: string; year: number; place: number | null }[]
  fargoFinishes?: readonly { year: number; division: string; placement: number | null }[]
}

function eventScore(event: string, place: number): number {
  if (/nhsca/i.test(event)) return 68.5 - 2.5 * (place - 1)
  if (/super 32/i.test(event)) return 85 - 4 * (place - 1)
  if (/beast of the east|ironman/i.test(event)) return 80 - 4 * (place - 1)
  if (/journeymen/i.test(event)) return 72 - 3 * (place - 1)
  return 65 - 3 * (place - 1)
}

/** A score for the opponent's record; 0 when nothing in it counts. */
export function recordStrength(record: OpponentRecord, nowYear = new Date().getFullYear()): number {
  const parts: number[] = []
  if (record.nationalRank) parts.push(130 - Math.min(record.nationalRank, 40))
  for (const f of record.stateFinishes ?? []) {
    if (!f.place || f.place < 1) continue // a qualifier who did not place
    const state = !f.state || f.state === "NCHSAA" ? "NC" : f.state
    parts.push((STATE_PLACE[f.place] ?? 28) * stateWeight(state) * divisionFactor(state, f.classification, f.year) * (f.year < nowYear - 1 ? 0.92 : 1))
  }
  for (const f of record.eventFinishes ?? []) {
    if (!f.place || f.place < 1) continue
    parts.push(eventScore(f.event, f.place) * (f.year < nowYear ? 0.9 : 1))
  }
  for (const f of record.fargoFinishes ?? []) {
    const place = f.placement && f.placement > 0 ? f.placement : 8
    parts.push(((/junior/i.test(f.division) ? 78 : 70) - 3 * (place - 1)) * (f.year < nowYear ? 0.9 : 1))
  }
  if (!parts.length) return 0
  parts.sort((a, b) => b - a)
  // Each further credential adds a little: a repeat placer, a placer who is also an All-American.
  return Math.round((parts[0]! + Math.min(parts.length - 1, 3) * 2) * 10) / 10
}

const ORD = String.raw`(\d)(?:st|nd|rd|th)`

/** A printed credential line read back into a record - for wins that carry no computed score. */
export function recordFromCredential(credential: string | null | undefined, nowYear = new Date().getFullYear()): OpponentRecord {
  const c = credential ?? ""
  const ranks = [...c.matchAll(/#(\d+)\s+(?:Sports Illustrated|MatScouts|FloWrestling|Flo|InterMat|SI)\b/g)].map((m) => Number(m[1]))
  const stateFinishes: { year: number; place: number; classification: string | null; state: string }[] = []
  const eventFinishes: { event: string; year: number; place: number }[] = []
  const fargoFinishes: { year: number; division: string; placement: number | null }[] = []
  const stateOf = (s: string) => (s === "NCHSAA" || s === "NCISA" ? "NC" : s)

  for (const m of c.matchAll(/(\d{4}) NHSCA (?:Champion|All-American \((\d)\w\w)/g)) {
    eventFinishes.push({ event: "NHSCA", year: Number(m[1]), place: m[2] ? Number(m[2]) : 1 })
  }
  for (const m of c.matchAll(/(\d)x NHSCA All-American \(([\d, ]+)\)/g)) {
    // Places are not printed for a multiple All-American; take each as 6th.
    for (const y of m[2].split(/,\s*/)) eventFinishes.push({ event: "NHSCA", year: Number(y), place: 6 })
  }
  for (const m of c.matchAll(new RegExp(String.raw`(\d{4}) (Super 32 Girls|Super 32|Beast of the East|Ironman|Journeymen[\w ]*?) (?:Champion|${ORD})`, "g"))) {
    eventFinishes.push({ event: m[2], year: Number(m[1]), place: m[3] ? Number(m[3]) : 1 })
  }
  for (const m of c.matchAll(/(\d{4}) Fargo (.+?) All-American(?: \((\d)\w\w\))?/g)) {
    fargoFinishes.push({ year: Number(m[1]), division: m[2], placement: m[3] ? Number(m[3]) : null })
  }
  for (const m of c.matchAll(/(\d)x Fargo All-American \((\d{4}) ([^)]+)\)/g)) {
    for (let i = 0; i < Number(m[1]); i++) fargoFinishes.push({ year: Number(m[2]), division: m[3], placement: null })
  }
  const multi = c.match(/(\d)x State Champion \((\d{4}) (NCHSAA|NCISA|[A-Z]{2})(?: ([^)]+))?\)/)
  if (multi) {
    for (let i = 0; i < Number(multi[1]); i++) {
      stateFinishes.push({ year: Number(multi[2]) - i, place: 1, classification: multi[3] === "NCISA" ? "NCISA" : multi[4] ?? null, state: stateOf(multi[3]) })
    }
  }
  // "2026 OH Division III State Runner-up", "2026 NCHSAA 8A State Champion", "GA State Champion".
  for (const m of c.matchAll(new RegExp(String.raw`(?:(\d{4}) )?(NCHSAA|NCISA|[A-Z]{2})\b([^·]*?)State (Champion\b|Runner-up|${ORD})`, "g"))) {
    const place = m[4] === "Champion" ? 1 : m[4] === "Runner-up" ? 2 : Number(m[5])
    const cls = m[2] === "NCISA" ? "NCISA" : m[3].trim() || null
    stateFinishes.push({ year: m[1] ? Number(m[1]) : nowYear, place, classification: cls, state: stateOf(m[2]) })
  }
  // "2x GA State Placer": the best finish is printed; the others count as further placings.
  const repeat = c.match(/(\d)x (?:([A-Z]{2}) )?State Placer/)
  if (repeat && stateFinishes.length) {
    for (let i = stateFinishes.length; i < Number(repeat[1]); i++) stateFinishes.push({ ...stateFinishes[0], place: 8 })
  }
  return { nationalRank: ranks.length ? Math.min(...ranks) : null, stateFinishes, eventFinishes, fargoFinishes }
}

/** A score read from a printed credential line; 0 when nothing on it is recognised. */
export function winStrength(credential: string | null | undefined, nowYear = new Date().getFullYear()): number {
  return recordStrength(recordFromCredential(credential, nowYear), nowYear)
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

type ScorableWin = { opponent: string; credential?: string | null; date?: string | null; strength?: number | null }

/** Newest first; undated wins last, in their original order. */
export function newestFirst<T extends ScorableWin>(wins: readonly T[]): T[] {
  return wins
    .map((w, i) => ({ w, i, t: winDate(w.date) }))
    .sort((x, y) => (Number.isNaN(x.t) ? 1 : 0) - (Number.isNaN(y.t) ? 1 : 0) || (y.t || 0) - (x.t || 0) || x.i - y.i)
    .map(({ w }) => w)
}

/** The win's score: the computed record where the win carries one, else its printed line. */
export function scoreOf(win: ScorableWin, nowYear: number): number {
  return typeof win.strength === "number" && win.strength > 0 ? win.strength : winStrength(win.credential, nowYear)
}

/** The strongest wins of the last 12 months, one per opponent. */
export function topWins<T extends ScorableWin>(wins: readonly T[], now = Date.now(), count = 5): T[] {
  const nowYear = new Date(now).getUTCFullYear()
  const best = new Map<string, { w: T; score: number; t: number }>()
  for (const w of wins) {
    const t = winDate(w.date)
    if (Number.isNaN(t) || now - t > YEAR_MS) continue
    const score = scoreOf(w, nowYear)
    if (score <= 0) continue
    const key = w.opponent.trim().toLowerCase()
    const kept = best.get(key)
    if (!kept || score > kept.score || (score === kept.score && t > kept.t)) best.set(key, { w, score, t })
  }
  return [...best.values()].sort((a, b) => b.score - a.score || b.t - a.t).slice(0, count).map((x) => x.w)
}
