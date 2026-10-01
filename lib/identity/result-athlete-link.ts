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
  rowNameMatchesAthleteContext,
  schoolsLikelySame,
  scoreAthleteRowMatch,
  tournamentYearFitsGradYear,
  tournamentYearFitsGradYearLoose,
  type AthleteMatchContext,
} from "@/lib/athlete-name-match"

/** Bump when the rules change, so links made under older rules can be found and re-checked. */
export const LINK_MATCHER_VERSION = "2026-10-01.2"

export type AthleteForLink = {
  id: string
  name: string
  wrestlingName: string | null
  graduationYear: number | null
  highSchool: string | null
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

function contextOf(a: AthleteForLink): AthleteMatchContext {
  return { displayName: a.name, wrestlingName: a.wrestlingName, graduationYear: a.graduationYear, highSchool: a.highSchool }
}

type Assessed = LinkCandidate & { contradicted: boolean; corroborated: boolean; schoolAgrees: boolean }

function assess(row: ResultRowForLink, a: AthleteForLink): Assessed {
  const signals: string[] = []
  const schoolComparable = Boolean(row.school?.trim()) && Boolean(a.highSchool?.trim())
  const schoolAgrees = schoolComparable && schoolsLikelySame(a.highSchool, row.school)
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
  const contradicted = divisionContradicts || stateContradicts || softContradiction
  // Name plus a year window is how namesakes got in; corroboration needs the school or the division.
  const corroborated = !contradicted && (schoolAgrees || divisionAgrees)

  return {
    athleteId: a.id,
    name: a.name,
    graduationYear: a.graduationYear,
    highSchool: a.highSchool,
    score: scoreAthleteRowMatch(contextOf(a), { name: row.name, school: row.school, year: row.year }),
    signals,
    contradicted,
    corroborated,
    schoolAgrees,
  }
}

const strip = ({ contradicted: _c, corroborated: _r, schoolAgrees: _s, ...rest }: Assessed): LinkCandidate => rest

export function decideLink(row: ResultRowForLink, athletes: readonly AthleteForLink[]): LinkDecision {
  const named = athletes.filter((a) => rowNameMatchesAthleteContext(row.name, contextOf(a)))
  const assessed = named.map((a) => assess(row, a)).sort((x, y) => y.score - x.score)
  const candidates = assessed.map(strip)
  const viable = assessed.filter((c) => !c.contradicted)
  const corroborated = viable.filter((c) => c.corroborated)

  let decision: LinkDecision
  if (!named.length) decision = { status: "no_match", reason: "no_profile", candidates }
  else if (!viable.length) decision = { status: "no_match", reason: "namesake_rejected", candidates }
  else if (corroborated.length === 1 && viable.length === 1) {
    const c = corroborated[0]
    decision = { status: "linked", athleteId: c.athleteId, score: c.score, reason: c.signals.join(", "), candidates }
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
