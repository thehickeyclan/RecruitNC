/**
 * Which athlete profile a tournament result row belongs to — decided once, at import, and stored.
 *
 * Every profile, scouting report, ranking and star rating used to answer this question again on
 * every view, by name, across five or six tables: 1.5 million name lookups in one week for 512
 * athletes, about 70% of all database time. Nationally that cost grows with athletes times page
 * views, and the name alone gets less reliable with every state added — the namesakes already
 * met in North Carolina (a 2020 "Joshua Wilson" credited to a 2027 wrestler) multiply by fifty.
 *
 * This is step one of moving to stored links. It is deliberately conservative: a row is linked only
 * when one profile fits and the record corroborates it (same school, or an NHSCA division that pins
 * the class year). Anything else is either left unlinked — no profile, or a namesake the record
 * contradicts — or sent to a person to review. A wrong link is worse than a missing one, because a
 * missing one still falls back to today's name matching.
 *
 * Built on the same rules the read path uses (`lib/athlete-name-match.ts`), so a link here agrees
 * with what the profile already shows.
 */

import {
  firstNamesLikelySame,
  rowNameMatchesAthleteContext,
  schoolsLikelySame,
  scoreAthleteRowMatch,
  tournamentYearFitsGradYear,
  tournamentYearFitsGradYearLoose,
  type AthleteMatchContext,
} from "@/lib/athlete-name-match"

/** Bump when the rules change, so links made under older rules can be found and re-checked. */
export const LINK_MATCHER_VERSION = "2026-10-01.8"

export type AthleteForLink = {
  id: string
  name: string
  wrestlingName: string | null
  graduationYear: number | null
  highSchool: string | null
  /** The athlete's club: some brackets print the team a wrestler entered under, not his school. */
  club?: string | null
  state: string | null
}

export type ResultRowForLink = {
  name: string
  school: string | null
  year: number | null
  /** NHSCA brackets are by grade: "Junior" in 2026 is the class of 2027. */
  division?: string | null
  /** The class year the source itself records (national rankings do). Strongest signal there is. */
  classYear?: number | null
  state?: string | null
  /**
   * The source's "school" column often holds a club or team instead (Super 32: "Point", "Valley",
   * "Boomer"). Then a different name there is not evidence of a different wrestler.
   */
  schoolMayBeClub?: boolean
  /**
   * A high-school season result (NCHSAA). One dated after the athlete's class graduated belongs to
   * someone else: Connor Byrd, class of 2024, was linked to a 2026 state result at his old school.
   */
  highSchoolSeason?: boolean
  /**
   * NCISA lets 7th and 8th graders wrestle varsity: Josh Stonebraker won a 2023 NCISA title at Cary
   * Christian in 8th grade. Its window opens three years earlier than the NCHSAA's.
   */
  middleSchoolEligible?: boolean
  /** A link already stored on the source row by an earlier import. */
  existingAthleteId?: string | null
}

export type LinkCandidate = {
  athleteId: string
  name: string
  graduationYear: number | null
  highSchool: string | null
  score: number
  signals: string[]
}

export type LinkDecision =
  | { status: "linked"; athleteId: string; score: number; reason: string; candidates: LinkCandidate[] }
  | { status: "review"; reason: string; candidates: LinkCandidate[] }
  | { status: "no_match"; reason: "no_profile" | "namesake_rejected"; candidates: LinkCandidate[] }

const GRADE_OFFSET: Array<[RegExp, number]> = [
  [/\bsenior\b/i, 0],
  [/\bjunior\b/i, 1],
  [/\bsophomore\b/i, 2],
  [/\bfreshman\b/i, 3],
]

/** The class an NHSCA-style grade division implies for a given tournament year, or null. */
export function gradYearFromDivision(division: string | null | undefined, year: number | null): number | null {
  if (!division || year == null) return null
  for (const [rx, offset] of GRADE_OFFSET) if (rx.test(division)) return year + offset
  return null
}

function normState(s: string | null | undefined): string | null {
  const t = (s ?? "").trim().toUpperCase()
  if (!t) return null
  if (t === "NORTH CAROLINA") return "NC"
  return t.length === 2 ? t : null
}

const SCHOOL_STOP = new Set(["high", "school", "hs", "the", "of", "and", "senior", "magnet", "charter", "academy", "county"])

function schoolWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.'’,\-()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w === "saint" ? "st" : w === "mount" ? "mt" : w === "fort" ? "ft" : w))
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

/**
 * Same school, allowing for how differently brackets spell one: "Pine Forest" / "Pine Forrest",
 * "Mt. Pleasant" / "Mount Pleasant", "Fred T. Foard" / "Fred T Foard", "St. Stephens" / "Saint
 * Stephens", and "CATA" for Central Academy of Technology and Arts. Most of Matt's first "same
 * wrestler" calls were spelling, not judgment.
 */
export function schoolsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false
  if (schoolsLikelySame(a, b)) return true
  const wa = schoolWords(a), wb = schoolWords(b)
  const core = (w: string[]) => w.filter((x) => !SCHOOL_STOP.has(x)).join(" ")
  const ca = core(wa), cb = core(wb)
  if (!ca || !cb) return false
  if (ca === cb || ca.includes(cb) || cb.includes(ca)) return true
  const initials = (w: string[]) => w.filter((x) => !["of", "and", "the"].includes(x)).map((x) => x[0]).join("")
  if (ca.length <= 5 && !ca.includes(" ") && (ca === initials(wb) || ca === initials(wb.filter((x) => !SCHOOL_STOP.has(x))))) return true
  if (cb.length <= 5 && !cb.includes(" ") && (cb === initials(wa) || cb === initials(wa.filter((x) => !SCHOOL_STOP.has(x))))) return true
  const longest = Math.max(ca.length, cb.length)
  return longest >= 6 && editDistance(ca, cb) <= (longest >= 12 ? 2 : 1)
}

function nameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s]+/)
    .filter(Boolean)
}

/**
 * A looser name match for import quirks the exact rules miss, used only with corroboration:
 *
 *   - extra words after the name: some NHSCA rows carry the school glued on ("Garrison Raper China")
 *   - hyphenated or double surnames: "Jalen Terry-Winston", "Favio Jaramillo Esparza"
 *   - one letter off in a long surname: "Abdel Adams" for "Abdel Adam"
 *
 * The first name must agree, nicknames included (Josh / Joshua), so "Julian Figueredo" is never
 * taken for "Josh Figueredo".
 */
export function looseNameMatch(rowName: string, athleteName: string): boolean {
  const r = nameTokens(rowName), a = nameTokens(athleteName)
  if (r.length < 2 || a.length < 2 || !(r[0] === a[0] || firstNamesLikelySame(r[0], a[0]))) return false
  const last = a[a.length - 1]
  return r.slice(1).some((t) => {
    if (t === last) return true
    const parts = t.split("-")
    if (parts.includes(last)) return true
    if (last.includes("-") && last.split("-").includes(t)) return true
    return last.length >= 4 && t.length >= 4 && Math.abs(t.length - last.length) <= 1 && editDistance(t, last) <= 1
  })
}

/** Words in the row's name after the athlete's surname (the glued-on school, if any). */
function trailingWords(rowName: string, athleteName: string): string {
  const r = nameTokens(rowName), last = nameTokens(athleteName).pop() ?? ""
  const i = r.findIndex((t, k) => k > 0 && (t === last || t.split("-").includes(last) || editDistance(t, last) <= 1))
  return i >= 0 ? r.slice(i + 1).join(" ") : ""
}

/** Whole-school agreement for loose names: same core words, spelling forgiven, no substrings. */
function schoolWordsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false
  const core = (s: string) => schoolWords(s).filter((x) => !SCHOOL_STOP.has(x)).join(" ")
  const ca = core(a), cb = core(b)
  if (!ca || !cb) return false
  return ca === cb || (Math.max(ca.length, cb.length) >= 6 && editDistance(ca, cb) <= 1)
}

function contextOf(a: AthleteForLink): AthleteMatchContext {
  return { displayName: a.name, wrestlingName: a.wrestlingName, graduationYear: a.graduationYear, highSchool: a.highSchool }
}

type Assessed = LinkCandidate & {
  /** Matched only through `looseNameMatch`: needs school or division to back it up. */
  looseName: boolean
  contradicted: boolean
  corroborated: boolean
  schoolAgrees: boolean
  /** Nothing to compare the school against, and the class year fits the strict window. */
  silentSchoolYearFits: boolean
}

function assess(row: ResultRowForLink, a: AthleteForLink, looseName = false): Assessed {
  const signals: string[] = []
  /*
   * A loosely matched name may have swallowed the start of the school: NHSCA printed "Garrison
   * Raper China" with school "Grove". Rebuild "China Grove" and require that - "Grove" alone would
   * match Providence Grove too.
   */
  const extra = looseName ? trailingWords(row.name, a.name) : ""
  const rowSchool = looseName && extra ? `${extra} ${row.school ?? ""}`.trim() : row.school
  const schoolAgrees = looseName
    ? [rowSchool, row.school].some((s) => Boolean(s?.trim()) && (schoolWordsEqual(a.highSchool, s) || schoolWordsEqual(a.club, s)))
    : Boolean(row.school?.trim()) && (schoolsMatch(a.highSchool, row.school) || schoolsMatch(a.club, row.school))
  // A club-or-school column that names something else is silence, not disagreement.
  const schoolComparable = Boolean(row.school?.trim()) && Boolean(a.highSchool?.trim()) && (schoolAgrees || !row.schoolMayBeClub)
  const yearComparable = row.year != null && a.graduationYear != null
  const yearStrict = yearComparable && tournamentYearFitsGradYear(row.year!, a.graduationYear!)
  const yearLoose = yearComparable && tournamentYearFitsGradYearLoose(row.year!, a.graduationYear!)
  const impliedGrad = row.classYear ?? gradYearFromDivision(row.division, row.year)
  const divisionComparable = impliedGrad != null && a.graduationYear != null
  const divisionAgrees = divisionComparable && impliedGrad === a.graduationYear
  // NHSCA lets a wrestler enter an older grade's bracket, never a younger one: a 2029 freshman in
  // the Junior division is wrestling up. Only a division younger than the athlete rules him out.
  // A recorded class year (national rankings) is exact, so any difference counts there.
  const divisionContradicts =
    divisionComparable && (row.classYear != null ? impliedGrad !== a.graduationYear : impliedGrad! > a.graduationYear!)
  const rowState = normState(row.state)
  const athleteState = normState(a.state)
  const stateContradicts = rowState != null && athleteState != null && rowState !== athleteState

  if (schoolAgrees) signals.push("school")
  else if (schoolComparable) signals.push("school differs")
  if (divisionAgrees) signals.push("division class")
  else if (divisionContradicts) signals.push(`division says ${impliedGrad}`)
  else if (divisionComparable) signals.push("wrestled up a division")
  if (yearStrict) signals.push("year")
  else if (yearComparable && !yearLoose) signals.push("year out of range")
  if (stateContradicts) signals.push(`state ${rowState}`)

  // Hard contradictions first: a grade division or a state that points elsewhere is a different
  // wrestler whatever the name says. Then the read path's rule: every comparable signal disagrees.
  const softContradiction =
    (schoolComparable || yearComparable) && !(schoolComparable && schoolAgrees) && !(yearComparable && yearLoose)
  const afterGraduation = Boolean(row.highSchoolSeason) && row.year != null && a.graduationYear != null && row.year > a.graduationYear
  if (afterGraduation) signals.push("after he graduated")
  // The state tournament is high school only, and a class's first one is the February of its
  // freshman year: three before graduation. Eli Thomas (2026) was linked to 2020 and 2021 titles.
  const firstSeason = a.graduationYear == null ? null : a.graduationYear - (row.middleSchoolEligible ? 6 : 3)
  const beforeHighSchool = Boolean(row.highSchoolSeason) && row.year != null && firstSeason != null && row.year < firstSeason
  if (beforeHighSchool) signals.push("before he reached high school")
  const contradicted = divisionContradicts || stateContradicts || softContradiction || afterGraduation || beforeHighSchool
  // Name plus a year window is how namesakes got in; corroboration needs the school or the division.
  const corroborated = !contradicted && (schoolAgrees || divisionAgrees)

  return {
    athleteId: a.id,
    name: a.name,
    graduationYear: a.graduationYear,
    highSchool: a.highSchool,
    score: scoreAthleteRowMatch(contextOf(a), { name: row.name, school: row.school, year: row.year }),
    signals,
    looseName,
    contradicted,
    corroborated,
    schoolAgrees,
    silentSchoolYearFits: !looseName && !contradicted && !schoolComparable && !schoolAgrees && yearStrict,
  }
}

const strip = ({ looseName: _l, contradicted: _c, corroborated: _r, schoolAgrees: _s, silentSchoolYearFits: _y, ...rest }: Assessed): LinkCandidate =>
  rest

export function decideLink(row: ResultRowForLink, athletes: readonly AthleteForLink[]): LinkDecision {
  const exact = athletes.filter((a) => rowNameMatchesAthleteContext(row.name, contextOf(a)))
  const loose = exact.length ? [] : athletes.filter((a) => looseNameMatch(row.name, a.name))
  const named = [...exact, ...loose]
  const assessed = [...exact.map((a) => assess(row, a)), ...loose.map((a) => assess(row, a, true))].sort((x, y) => y.score - x.score)
  const candidates = assessed.map(strip)
  const viable = assessed.filter((c) => !c.contradicted)
  const corroborated = viable.filter((c) => c.corroborated)

  let decision: LinkDecision
  if (!named.length) decision = { status: "no_match", reason: "no_profile", candidates }
  else if (!viable.length) decision = { status: "no_match", reason: "namesake_rejected", candidates }
  else if (corroborated.length === 1 && viable.length === 1) {
    const c = corroborated[0]
    decision = { status: "linked", athleteId: c.athleteId, score: c.score, reason: c.signals.join(", "), candidates }
  } else if (viable.length === 1 && viable[0].silentSchoolYearFits) {
    /*
     * The source lists no school, one profile has the name, and its class year fits. Matt, 1
     * October 2026: link these rather than queue them. The profile already shows these results
     * through name matching, so storing the link changes nothing anyone sees - 59 of the first 94
     * review rows were this, mostly Super 32 and qualifier brackets. A school that differs still
     * goes to review: that is a transfer or a namesake, and only a person can tell which.
     */
    const c = viable[0]
    decision = { status: "linked", athleteId: c.athleteId, score: c.score, reason: "name and class year; source lists no school", candidates }
  } else if (corroborated.length === 1) {
    // Two profiles share the name; one is corroborated and the other merely not contradicted.
    // Common with duplicate profiles - exactly what a person should see.
    decision = { status: "review", reason: "two profiles fit the name; one corroborated", candidates }
  } else if (corroborated.length > 1) {
    decision = { status: "review", reason: "several profiles corroborated", candidates }
  } else {
    decision = { status: "review", reason: "name fits but school and division do not confirm it", candidates }
  }

  // An earlier import already linked this row. Agreement confirms it; disagreement is the most
  // useful thing this pass can find, so it always goes to a person.
  const existing = row.existingAthleteId ?? null
  if (existing) {
    if (decision.status === "linked" && decision.athleteId === existing) {
      return { ...decision, reason: `existing link confirmed (${decision.reason})` }
    }
    if (decision.status === "linked" || (decision.status === "no_match" && decision.reason === "namesake_rejected")) {
      return { status: "review", reason: "existing link disagrees with the record", candidates }
    }
    /*
     * An earlier link the record does not confirm. If the source names a different school it is a
     * transfer or a namesake - a person's call: Eli Thomas of Laney was linked to an Alleghany
     * third place that belongs to another Eli Thomas. Only a link nothing speaks against is kept.
     */
    const linkedCandidate = candidates.find((c) => c.athleteId === existing)
    if (!linkedCandidate || linkedCandidate.signals.includes("school differs")) {
      return { status: "review", reason: "earlier link names a different school (transfer or namesake?)", candidates }
    }
    return { status: "linked", athleteId: existing, score: 0, reason: "existing link kept (matcher could not confirm)", candidates }
  }
  return decision
}

/**
 * Narrow the athlete list to those sharing a name token with the row, before the full comparison.
 * Every surname piece is indexed, hyphenated halves included, so "Tufts-Piercy" still finds "Tufts".
 */
export function buildNameIndex(athletes: readonly AthleteForLink[]): (rowName: string) => AthleteForLink[] {
  const tokens = (s: string | null | undefined) =>
    (s ?? "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .split(/[\s,\-.]+/)
      .filter((t) => t.length >= 2)
  const index = new Map<string, AthleteForLink[]>()
  for (const a of athletes) {
    for (const t of new Set([...tokens(a.name), ...tokens(a.wrestlingName)])) {
      const list = index.get(t) ?? []
      list.push(a)
      index.set(t, list)
    }
  }
  return (rowName) => {
    const out = new Set<AthleteForLink>()
    for (const t of tokens(rowName)) for (const a of index.get(t) ?? []) out.add(a)
    return [...out]
  }
}
