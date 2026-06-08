/**
 * Single source for athlete ↔ tournament row matching (names, school, grad year).
 * Used by NCHSAA merge, NHSCA/Super32 tables, Data Dawg cross-store search, duplicate checks, commitment cards.
 */
import { plausibleNchsaaYearsForGradYear } from "@/lib/nchsaa-plausible-years"
import { parseFirstLastForNchsaa } from "@/lib/nchsaa-profile-fetch"

/** Known same-person spellings in tournament tables vs RecruitNC profiles. */
export const ATHLETE_SAME_PERSON_ALIAS_GROUPS: string[][] = [
  ["Holt Quincy", "Holton Quincy", "Holt Quickny", "Holton Quickny"],
  ["Colt Cambruzzi", "Colt Cambruzi", "Cole Cambruzzi", "Cole Cambruzi"],
  ["Carter Furman", "Carter Furmann", "Carter Forman"],
  ["Miller Menteer", "Miller Mentzer"],
  ["Nevaeh Williamson", "Nevaeh Willamson"],
  ["Cam Stinson", "Cameron Stinson"],
  ["Jackson D'Ettore", "Jackson Dettore", "Jackson D\u2019Ettore"],
  ["Samuel Gantt", "Sammy Gantt"],
  ["Elias Marquez Flores", "Elias Marquez"],
  ["Max Davis", "Maxwell Davis"],
  ["Zach Smith", "Zack Smith"],
  ["Ammon Smith", "Amon Smith"],
]

/** Nickname / formal first-name pairs — expands search variants both directions. */
export const ATHLETE_FIRST_NAME_EQUIVALENT_GROUPS: string[][] = [
  ["Maxwell", "Max"],
  ["Matthew", "Matt"],
  ["Michael", "Mike", "Mick"],
  ["William", "Will", "Bill", "Billy"],
  ["Robert", "Bob", "Rob", "Bobby"],
  ["Richard", "Rick", "Dick"],
  ["James", "Jim", "Jimmy", "Jamie"],
  ["Joseph", "Joe", "Joey"],
  ["Anthony", "Tony"],
  ["Nicholas", "Nick", "Nicky"],
  ["Christopher", "Chris"],
  ["Benjamin", "Ben"],
  ["Samuel", "Sam", "Sammy"],
  ["Daniel", "Dan", "Danny"],
  ["Joshua", "Josh"],
  ["Thomas", "Tom", "Tommy"],
  ["Andrew", "Andy"],
  ["Patrick", "Pat"],
  ["Charles", "Chuck", "Charlie"],
  ["Edward", "Ed", "Eddie"],
  ["Kenneth", "Ken", "Kenny"],
  ["Donald", "Don"],
  ["Timothy", "Tim"],
  ["Stephen", "Steve"],
  ["Zachary", "Zach", "Zack"],
  ["Cameron", "Cam"],
  ["Nathan", "Nate"],
  ["Alexander", "Alex"],
  ["Jonathan", "Jon"],
  ["Gregory", "Greg"],
  ["Jeffrey", "Jeff"],
  ["Vincent", "Vince"],
  ["Bradford", "Brad"],
  ["Douglas", "Doug"],
  ["Lawrence", "Larry"],
  ["Raymond", "Ray"],
  ["Francis", "Frank"],
]

export type AthleteMatchContext = {
  displayName: string
  wrestlingName?: string | null
  graduationYear?: number | null
  highSchool?: string | null
  weightClass?: string | null
}

export type TournamentRowForMatch = {
  name: string
  school?: string | null
  year?: number | null
}

const CURLY_APOSTROPHE = "\u2019"

export function normalizeApostrophes(s: string): string {
  return (s ?? "")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
}

function normalizeForAlias(name: string): string {
  return normalizeApostrophes((name ?? "").trim().toLowerCase().replace(/`/g, "'"))
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
}

/** Same person regardless of "First Last" vs "Last, First" token order. */
export function namesReferToSamePerson(nameA: string, nameB: string): boolean {
  const norm = (s: string) =>
    normalizeApostrophes((s ?? "").trim().toLowerCase())
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ")
  const a = norm(nameA)
  const b = norm(nameB)
  return a === b && a !== ""
}

export function firstNamesLikelySame(firstA: string, firstB: string): boolean {
  const fa = normalizeApostrophes((firstA ?? "").trim()).toLowerCase()
  const fb = normalizeApostrophes((firstB ?? "").trim()).toLowerCase()
  if (!fa || !fb) return false
  if (fa === fb) return true
  if (fa.length >= 3 && fb.startsWith(fa)) return true
  if (fb.length >= 3 && fa.startsWith(fb)) return true

  for (const group of ATHLETE_FIRST_NAME_EQUIVALENT_GROUPS) {
    const lower = group.map((g) => g.toLowerCase())
    if (lower.includes(fa) && lower.includes(fb)) return true
  }
  return false
}

/** Educated guess: same last name + compatible first name (Max/Maxwell, Matt/Matthew, …). */
export function namesLikelySamePerson(nameA: string, nameB: string): boolean {
  if (namesReferToSamePerson(nameA, nameB)) return true

  const keyA = normalizeForAlias(nameA)
  const keyB = normalizeForAlias(nameB)
  for (const group of ATHLETE_SAME_PERSON_ALIAS_GROUPS) {
    const norms = group.map((s) => normalizeForAlias(s))
    if (norms.includes(keyA) && norms.includes(keyB)) return true
  }

  const pa = parseFirstLastForNchsaa(nameA)
  const pb = parseFirstLastForNchsaa(nameB)
  if (!pa || !pb) return false
  if (pa.last.toLowerCase() !== pb.last.toLowerCase()) return false
  return firstNamesLikelySame(pa.first, pb.first)
}

export function rowNameMatchesAthleteContext(rowName: string, context: AthleteMatchContext): boolean {
  const rn = (rowName ?? "").trim()
  if (!rn) return false
  if (namesLikelySamePerson(rn, context.displayName)) return true
  const wn = (context.wrestlingName ?? "").trim()
  if (wn && namesLikelySamePerson(rn, wn)) return true
  for (const v of getAthleteNameSearchVariants(context.displayName)) {
    if (namesReferToSamePerson(rn, v)) return true
  }
  if (wn) {
    for (const v of getAthleteNameSearchVariants(wn)) {
      if (namesReferToSamePerson(rn, v)) return true
    }
  }
  return false
}

export function schoolsLikelySame(a?: string | null, b?: string | null): boolean {
  const x = (a ?? "").trim().toLowerCase()
  const y = (b ?? "").trim().toLowerCase()
  if (!x || !y) return false
  return x.includes(y) || y.includes(x)
}

export function tournamentYearFitsGradYear(tournamentYear: number, gradYear: number): boolean {
  if (!Number.isFinite(tournamentYear) || !Number.isFinite(gradYear)) return true
  const { min, max } = plausibleNchsaaYearsForGradYear(gradYear)
  return tournamentYear >= min && tournamentYear <= max
}

/** Grad −6 … grad +1 — same window as Data Dawg cross-store narrowing. */
export function tournamentYearFitsGradYearLoose(tournamentYear: number, gradYear: number): boolean {
  if (!Number.isFinite(tournamentYear) || !Number.isFinite(gradYear)) return true
  const g = Math.floor(gradYear)
  return tournamentYear >= g - 6 && tournamentYear <= g + 1
}

export function scoreAthleteRowMatch(context: AthleteMatchContext, row: TournamentRowForMatch): number {
  let score = 0
  const rowName = (row.name ?? "").trim()
  if (!rowName) return 0

  if (namesReferToSamePerson(rowName, context.displayName)) score += 50
  else if (namesLikelySamePerson(rowName, context.displayName)) score += 40
  else {
    for (const v of getAthleteNameSearchVariants(context.displayName)) {
      if (namesReferToSamePerson(rowName, v)) {
        score += 35
        break
      }
    }
  }

  const wn = (context.wrestlingName ?? "").trim()
  if (wn && namesLikelySamePerson(rowName, wn)) score += 15

  const hs = (context.highSchool ?? "").trim()
  const rowSchool = (row.school ?? "").trim()
  if (hs && rowSchool && schoolsLikelySame(hs, rowSchool)) score += 25

  const gy = context.graduationYear
  const ty = row.year
  if (gy != null && ty != null && tournamentYearFitsGradYear(Number(ty), Number(gy))) score += 15
  else if (gy != null && ty != null && tournamentYearFitsGradYearLoose(Number(ty), Number(gy))) score += 8

  return score
}

const STRONG_ROW_SCORE = 35

/**
 * Drop wrong namesakes when we can confidently match on name + school + grad window.
 * If nothing scores well but rows exist, return originals (avoid hiding data).
 */
export function filterRowsByAthleteMatchContext<T>(
  rows: T[],
  context: AthleteMatchContext,
  accessor: (row: T) => TournamentRowForMatch,
  opts?: { minStrongScore?: number },
): T[] {
  if (!rows.length) return rows
  const minStrong = opts?.minStrongScore ?? STRONG_ROW_SCORE

  const scored = rows.map((row) => ({
    row,
    score: scoreAthleteRowMatch(context, accessor(row)),
  }))

  const strong = scored.filter((s) => s.score >= minStrong)
  if (strong.length > 0) return strong.map((s) => s.row)

  const nameOnly = scored.filter((s) => rowNameMatchesAthleteContext(accessor(s.row).name, context))
  if (nameOnly.length > 0) return nameOnly.map((s) => s.row)

  const gy = context.graduationYear
  const hs = (context.highSchool ?? "").trim()
  if (gy != null || hs) {
    const contextual = scored.filter((s) => {
      const r = accessor(s.row)
      const yearOk =
        gy == null || r.year == null || tournamentYearFitsGradYearLoose(Number(r.year), Number(gy))
      const schoolOk = !hs || !r.school?.trim() || schoolsLikelySame(hs, r.school)
      return yearOk && schoolOk && s.score >= 8
    })
    if (contextual.length > 0) return contextual.map((s) => s.row)
  }

  return rows
}

export function pickBestAthleteCandidate<T>(
  candidates: T[],
  context: AthleteMatchContext,
  accessor: (row: T) => {
    name: string
    highSchool?: string | null
    graduationYear?: number | null
  },
): T | null {
  if (!candidates.length) return null
  if (candidates.length === 1) return candidates[0]

  const matchContext: AthleteMatchContext = {
    ...context,
    highSchool: context.highSchool ?? accessor(candidates[0]).highSchool ?? null,
    graduationYear: context.graduationYear ?? accessor(candidates[0]).graduationYear ?? null,
  }

  let best: { row: T; score: number } | null = null
  for (const row of candidates) {
    const a = accessor(row)
    let score = scoreAthleteRowMatch(matchContext, {
      name: a.name,
      school: a.highSchool,
      year: null,
    })
    if (
      a.graduationYear != null &&
      matchContext.graduationYear != null &&
      a.graduationYear === matchContext.graduationYear
    ) {
      score += 10
    }
    if (!best || score > best.score) best = { row, score }
  }
  if (best && best.score >= 20) return best.row

  const hs = (matchContext.highSchool ?? "").trim()
  if (hs) {
    const bySchool = candidates.filter((c) => schoolsLikelySame(hs, accessor(c).highSchool))
    if (bySchool.length === 1) return bySchool[0]
  }

  const gy = matchContext.graduationYear
  if (gy != null) {
    const byGrad = candidates.filter((c) => accessor(c).graduationYear === gy)
    if (byGrad.length === 1) return byGrad[0]
  }

  return null
}

function expandFirstNameEquivalents(fullName: string): string[] {
  const t = normalizeApostrophes((fullName ?? "").trim())
  if (!t) return []
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length < 2) return []
  const firstLower = parts[0].toLowerCase()
  const rest = parts.slice(1).join(" ")
  const out: string[] = []
  for (const group of ATHLETE_FIRST_NAME_EQUIVALENT_GROUPS) {
    const lowerGroup = group.map((g) => g.toLowerCase())
    if (!lowerGroup.includes(firstLower)) continue
    for (const alt of group) {
      if (alt.toLowerCase() === firstLower) continue
      out.push(`${alt} ${rest}`)
    }
  }
  return out
}

/** All name spellings to query ILIKE / compare in memory (apostrophe, Last/First, aliases, nicknames). */
export function getAthleteNameSearchVariants(name: string): string[] {
  const t = normalizeApostrophes((name ?? "").trim())
  if (!t) return []
  const set = new Set<string>([t])
  const add = (s: string) => {
    if ((s ?? "").trim()) set.add(s.trim())
  }

  const withApostrophe = t.replace(/`/g, "'")
  if (withApostrophe !== t) add(withApostrophe)
  const noApostrophe = t.replace(/'/g, "").replace(/`/g, "").trim()
  if (noApostrophe && noApostrophe !== t) add(noApostrophe)

  if (t.includes(",")) {
    const [last, first] = t.split(",").map((s) => s.trim())
    if (first && last) add(`${first} ${last}`)
  } else {
    const parts = t.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) add(`${parts.slice(1).join(" ")}, ${parts[0]}`)
  }

  const key = normalizeForAlias(t)
  for (const group of ATHLETE_SAME_PERSON_ALIAS_GROUPS) {
    const norms = group.map((s) => normalizeForAlias(s))
    if (!norms.includes(key)) continue
    for (const spelling of group) {
      add(spelling)
      const noApo = spelling.replace(/'/g, "").replace(/\u2019/g, "").trim()
      if (noApo) add(noApo)
      const parts = spelling.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) add(`${parts.slice(1).join(" ")}, ${parts[0]}`)
    }
    break
  }

  const lower = t.toLowerCase()
  if (lower.includes("zach ") && !lower.includes("zack ")) add(t.replace(/\bZach\b/gi, "Zack"))
  if (lower.includes("zack ") && !lower.includes("zach ")) add(t.replace(/\bZack\b/gi, "Zach"))
  if (lower.includes("ammon ") && !lower.includes("amon ")) add(t.replace(/\bAmmon\b/gi, "Amon"))
  if (lower.includes("amon ") && !lower.includes("ammon ")) add(t.replace(/\bAmon\b/gi, "Ammon"))

  const expanded = new Set<string>(set)
  for (const v of [...set]) {
    if (v.includes(",")) continue
    const parts = v.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) expanded.add(`${parts.slice(1).join(" ")}, ${parts[0]}`)
    for (const alt of expandFirstNameEquivalents(v)) {
      expanded.add(alt)
      const ap = alt.split(/\s+/).filter(Boolean)
      if (ap.length >= 2) expanded.add(`${ap.slice(1).join(" ")}, ${ap[0]}`)
    }
  }

  return [...expanded]
}

/** Escape single quotes for Supabase ILIKE. */
export function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

export function getIlikePatternsForNameVariant(v: string): string[] {
  const escaped = `%${escapeForIlike(v)}%`
  const patterns = [escaped]
  if (v.includes("'")) {
    patterns.push(`%${v.replace(/'/g, CURLY_APOSTROPHE)}%`)
    patterns.push(`%${v.replace(/'/g, "`")}%`)
  }
  return patterns
}

/** @deprecated Use {@link getAthleteNameSearchVariants} */
export const getNameVariations = getAthleteNameSearchVariants

/** @deprecated Use {@link getAthleteNameSearchVariants} */
export const getNameVariants = getAthleteNameSearchVariants
