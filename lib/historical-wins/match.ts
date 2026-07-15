import type { HistoricalWinsMatchStatus } from "@/lib/historical-wins/constants"

export type AthleteMatchCandidate = {
  id: string
  name: string
  highschool?: string | null
  graduationyear?: number | string | null
}

export type SchoolMatchCandidate = {
  id: string
  name: string
}

export type MatchResult = {
  match_status: HistoricalWinsMatchStatus
  match_confidence: number | null
  match_reasons: string[]
  athlete_id: string | null
  school_id: string | null
  proposed_athlete_id: string | null
}

/** Normalize person/school display for conservative exact compare. */
export function normalizeHistoricalName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Detect nicknames / abbreviated given names that should not auto-match. */
export function nameNeedsReview(sourceName: string): boolean {
  const s = sourceName.trim()
  if (/[“”"]/.test(s)) return true
  if (/\b[A-Z]\.[A-Z]\./.test(s) || /\b[A-Z]\./.test(s)) return true
  if (/\b(bj|jc|jr|sr|iii|ii)\b/i.test(normalizeHistoricalName(s))) return true
  if (/[-']/.test(s) && /[a-z]-[A-Z]|[A-Z][a-z]+-[A-Z]/.test(s)) return true
  return false
}

export function normalizeSchoolKey(raw: string): string {
  return normalizeHistoricalName(raw)
    .replace(/\bhigh school\b/g, "")
    .replace(/\bhs\b/g, "")
    .replace(/\bacademy\b/g, "")
    .replace(/\sschool\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseGradYear(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d]/g, ""))
  if (!Number.isFinite(n) || n < 1980 || n > 2040) return null
  return Math.floor(n)
}

/**
 * Season participation is compatible with graduation year when:
 * season_end_year is within [gradYear - 4, gradYear + 1]
 * (covers freshman–senior HS window with slight slack).
 */
export function yearsCompatible(
  seasonEndYear: number,
  graduationYear: number | string | null | undefined,
): boolean | null {
  const g = parseGradYear(graduationYear)
  if (g == null) return null
  return seasonEndYear >= g - 4 && seasonEndYear <= g + 1
}

export function schoolsExactMatch(a: string, b: string): boolean {
  return normalizeSchoolKey(a) === normalizeSchoolKey(b)
}

/**
 * Conservative athlete + school match for one historical row.
 * Never creates profiles; never merges on fuzzy-only name similarity.
 */
export function matchHistoricalAthlete(args: {
  sourceName: string
  sourceSchool: string
  seasonEndYear: number
  athleteCandidates: AthleteMatchCandidate[]
  schoolCandidates: SchoolMatchCandidate[]
  /** Canonical school name from DB RPC, if any */
  dbCanonicalSchool?: string | null
}): MatchResult {
  const reasons: string[] = []
  const nameNorm = normalizeHistoricalName(args.sourceName)
  const schoolNorm = normalizeSchoolKey(args.sourceSchool)

  let school_id: string | null = null
  const exactSchools = args.schoolCandidates.filter(
    (s) => normalizeSchoolKey(s.name) === schoolNorm,
  )
  if (exactSchools.length === 1) {
    school_id = exactSchools[0].id
    reasons.push("school_exact")
  } else if (exactSchools.length > 1) {
    reasons.push("school_ambiguous")
  } else if (args.dbCanonicalSchool) {
    const canon = normalizeSchoolKey(args.dbCanonicalSchool)
    const byCanon = args.schoolCandidates.filter((s) => normalizeSchoolKey(s.name) === canon)
    if (byCanon.length === 1) {
      school_id = byCanon[0].id
      reasons.push("school_db_canonical")
    } else if (byCanon.length > 1) {
      reasons.push("school_canonical_ambiguous")
    } else {
      reasons.push("school_unresolved")
    }
  } else {
    reasons.push("school_unresolved")
  }

  const exactNameHits = args.athleteCandidates.filter(
    (a) => normalizeHistoricalName(a.name) === nameNorm,
  )

  if (nameNeedsReview(args.sourceName)) {
    reasons.push("name_needs_review")
  }

  if (exactNameHits.length === 0) {
    return {
      match_status: "unmatched",
      match_confidence: null,
      match_reasons: reasons.length ? reasons : ["no_name_match"],
      athlete_id: null,
      school_id,
      proposed_athlete_id: null,
    }
  }

  if (exactNameHits.length > 1) {
    // Prefer candidate whose school matches when possible
    const withSchool = exactNameHits.filter(
      (a) => a.highschool && schoolsExactMatch(a.highschool, args.sourceSchool),
    )
    if (withSchool.length === 1) {
      const y = yearsCompatible(args.seasonEndYear, withSchool[0].graduationyear)
      if (y === true && !nameNeedsReview(args.sourceName) && school_id) {
        return {
          match_status: "matched",
          match_confidence: 0.92,
          match_reasons: [...reasons, "name_exact", "school_exact", "years_ok", "disambiguated"],
          athlete_id: withSchool[0].id,
          school_id,
          proposed_athlete_id: withSchool[0].id,
        }
      }
      return {
        match_status: "needs_review",
        match_confidence: 0.7,
        match_reasons: [...reasons, "name_exact_multi", "school_preferred"],
        athlete_id: null,
        school_id,
        proposed_athlete_id: withSchool[0].id,
      }
    }
    return {
      match_status: "needs_review",
      match_confidence: 0.5,
      match_reasons: [...reasons, "name_exact_ambiguous"],
      athlete_id: null,
      school_id,
      proposed_athlete_id: exactNameHits[0].id,
    }
  }

  const athlete = exactNameHits[0]
  const schoolOk =
    Boolean(school_id) ||
    (athlete.highschool != null && schoolsExactMatch(athlete.highschool, args.sourceSchool))
  const yearOk = yearsCompatible(args.seasonEndYear, athlete.graduationyear)

  if (nameNeedsReview(args.sourceName)) {
    return {
      match_status: "needs_review",
      match_confidence: 0.55,
      match_reasons: [...reasons, "name_exact", "nickname_or_abbrev"],
      athlete_id: null,
      school_id,
      proposed_athlete_id: athlete.id,
    }
  }

  if (schoolOk && yearOk === true) {
    return {
      match_status: "matched",
      match_confidence: 0.95,
      match_reasons: [...reasons, "name_exact", "school_ok", "years_ok"],
      athlete_id: athlete.id,
      school_id:
        school_id ??
        null,
      proposed_athlete_id: athlete.id,
    }
  }

  if (schoolOk && yearOk === null) {
    return {
      match_status: "needs_review",
      match_confidence: 0.75,
      match_reasons: [...reasons, "name_exact", "school_ok", "years_unknown"],
      athlete_id: null,
      school_id,
      proposed_athlete_id: athlete.id,
    }
  }

  if (!schoolOk && yearOk === true) {
    return {
      match_status: "needs_review",
      match_confidence: 0.65,
      match_reasons: [...reasons, "name_exact", "school_mismatch", "years_ok"],
      athlete_id: null,
      school_id,
      proposed_athlete_id: athlete.id,
    }
  }

  if (!schoolOk) {
    return {
      match_status: "needs_review",
      match_confidence: 0.45,
      match_reasons: [...reasons, "name_exact", "school_mismatch"],
      athlete_id: null,
      school_id,
      proposed_athlete_id: athlete.id,
    }
  }

  return {
    match_status: "needs_review",
    match_confidence: 0.4,
    match_reasons: [...reasons, "name_exact", "years_incompatible"],
    athlete_id: null,
    school_id,
    proposed_athlete_id: athlete.id,
  }
}

/** Filter helper used by leaderboard / Data Dawg. */
export function filterSingleSeasonRows<
  T extends { wrestler_name: string; school: string; wins: number; year: string },
>(
  rows: T[],
  opts: {
    athleteQuery?: string
    schoolQuery?: string
    season?: string
    minWins?: number
  },
): T[] {
  const aq = opts.athleteQuery?.trim().toLowerCase()
  const sq = opts.schoolQuery?.trim().toLowerCase()
  const season = opts.season?.trim()
  const minWins = opts.minWins
  return rows.filter((r) => {
    if (aq && !r.wrestler_name.toLowerCase().includes(aq)) return false
    if (sq && !r.school.toLowerCase().includes(sq)) return false
    if (season && r.year !== season) return false
    if (minWins != null && r.wins < minWins) return false
    return true
  })
}
