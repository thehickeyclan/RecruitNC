import { tidy, type ParsedAthleteResult } from "@/lib/other-tournament-import"

export type NhscaDirectoryAthlete = {
  id: string
  name?: string | null
  wrestling_name?: string | null
  highschool?: string | null
  weightclass?: string | number | null
  graduationyear?: string | number | null
  gender?: string | null
}

export type NhscaDualsMatch = {
  source: ParsedAthleteResult
  athlete: NhscaDirectoryAthlete
}

export type NhscaDualsReview = {
  name: string
  team: string
  weight: string
  reason: string
  candidates: string[]
}

export function normalizeNhscaDualsName(value: string | null | undefined): string {
  return tidy(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function nhscaDualsEntrantKey(name: string, team: string): string {
  return `${normalizeNhscaDualsName(name)}|${tidy(team).toLowerCase()}`
}

function divisionOf(team: string): "HSB" | "HSG" | "MS" | "EL" | null {
  const match = tidy(team).match(/-\s*(HSB|HSG|MS|EL)\s*$/i)
  return (match?.[1]?.toUpperCase() as "HSB" | "HSG" | "MS" | "EL" | undefined) ?? null
}

function ageDivisionMatches(gradYear: number, division: ReturnType<typeof divisionOf>, eventYear: number): boolean {
  if (!division || !Number.isFinite(gradYear)) return false
  const seniorClass = eventYear
  if (division === "HSB" || division === "HSG") return gradYear >= seniorClass && gradYear <= seniorClass + 3
  if (division === "MS") return gradYear >= seniorClass + 4 && gradYear <= seniorClass + 6
  return gradYear >= seniorClass + 6
}

function genderMatches(gender: string | null | undefined, division: ReturnType<typeof divisionOf>): boolean {
  const value = tidy(gender).toLowerCase()
  if (!value || !division) return true
  return division === "HSG" ? value.startsWith("f") : !value.startsWith("f")
}

function weightMatches(profileWeight: string | number | null | undefined, sourceWeight: string, tolerance: number): boolean {
  const profile = Number(profileWeight)
  const source = Number(sourceWeight)
  if (!Number.isFinite(profile) || profile <= 0 || !Number.isFinite(source) || source <= 0) return false
  return Math.abs(profile - source) <= tolerance
}

function candidateLabel(athlete: NhscaDirectoryAthlete): string {
  return `${athlete.name ?? athlete.wrestling_name ?? "Unknown"} / ${athlete.highschool ?? "no school"} / ${athlete.graduationyear ?? "?"} / ${athlete.weightclass ?? "?"} lbs`
}

/**
 * Resolve nationwide NHSCA Duals entrants conservatively.
 *
 * The source has no school, state, graduation year or athlete id. Exact name alone is not
 * enough nationwide, so automatic links require one profile, one source team, the correct
 * age/gender division and a plausible weight. NC United is excluded because its results are
 * already merged from the national-team source.
 */
export function resolveNhscaNationalDualsProfiles(
  entrants: ParsedAthleteResult[],
  directory: NhscaDirectoryAthlete[],
  options: { eventYear: number; weightTolerance?: number; excludedTeam?: RegExp },
): { matches: NhscaDualsMatch[]; review: NhscaDualsReview[] } {
  const tolerance = options.weightTolerance ?? 15
  const excludedTeam = options.excludedTeam ?? /\bnc united\b|\bnorth carolina united\b/i
  const profilesByName = new Map<string, NhscaDirectoryAthlete[]>()
  for (const athlete of directory) {
    for (const raw of [athlete.name, athlete.wrestling_name]) {
      const key = normalizeNhscaDualsName(raw)
      if (!key) continue
      const profiles = profilesByName.get(key) ?? []
      if (!profiles.some((row) => row.id === athlete.id)) profiles.push(athlete)
      profilesByName.set(key, profiles)
    }
  }

  const teamsByName = new Map<string, Set<string>>()
  for (const entrant of entrants) {
    const key = normalizeNhscaDualsName(entrant.athleteName)
    const teams = teamsByName.get(key) ?? new Set<string>()
    teams.add(tidy(entrant.club).toLowerCase())
    teamsByName.set(key, teams)
  }

  const matches: NhscaDualsMatch[] = []
  const review: NhscaDualsReview[] = []
  for (const source of entrants) {
    if (excludedTeam.test(source.club)) continue
    const key = normalizeNhscaDualsName(source.athleteName)
    const candidates = profilesByName.get(key) ?? []
    if (!candidates.length) continue

    let reason = ""
    if ((teamsByName.get(key)?.size ?? 0) !== 1) reason = "Same name appears on multiple source teams"
    else if (candidates.length !== 1) reason = "Name matches multiple NC profiles"
    else {
      const candidate = candidates[0]!
      const division = divisionOf(source.club)
      const gradYear = Number(candidate.graduationyear)
      if (!ageDivisionMatches(gradYear, division, options.eventYear)) reason = "Graduation year does not match source division"
      else if (!genderMatches(candidate.gender, division)) reason = "Gender does not match source division"
      else if (!weightMatches(candidate.weightclass, source.weightClass, tolerance)) reason = "Profile and source weights are too far apart"
      else {
        matches.push({ source, athlete: candidate })
        continue
      }
    }

    review.push({
      name: source.athleteName,
      team: source.club,
      weight: source.weightClass,
      reason,
      candidates: candidates.map(candidateLabel),
    })
  }
  return { matches, review }
}
