import type { SupabaseClient } from "@supabase/supabase-js"
import {
  escapeForIlike,
  filterRowsByAthleteMatchContext,
  getAthleteNameSearchVariants,
  getIlikePatternsForNameVariant,
  namesLikelySamePerson,
  namesReferToSamePerson,
  normalizeApostrophes,
  rowNameMatchesAthleteContext,
  type AthleteMatchContext,
} from "@/lib/athlete-name-match"
import { fetchNchsaaResultsForAthleteProfile } from "@/lib/nchsaa-profile-fetch"
import { NCHSAA_FOUR_TIME_STATE_CHAMPIONS } from "@/lib/nchsaa-four-time-state-champions-data"
import { plausibleNchsaaYearsForGradYear } from "@/lib/nchsaa-plausible-years"
import type { NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
import { nchsaaJsonToProfileRows } from "@/lib/nchsaa-results-json"
export { nchsaaJsonToProfileRows, type NchsaaRowForProfile } from "@/lib/nchsaa-results-json"
export { plausibleNchsaaYearsForGradYear } from "@/lib/nchsaa-plausible-years"
export {
  ATHLETE_SAME_PERSON_ALIAS_GROUPS,
  escapeForIlike,
  getAthleteNameSearchVariants,
  namesLikelySamePerson,
  namesReferToSamePerson,
  normalizeApostrophes,
} from "@/lib/athlete-name-match"

/** Same name variations as /api/wrestling-achievements — delegates to shared athlete-name-match. */
export function getNameVariations(name: string): string[] {
  return getAthleteNameSearchVariants(name)
}

const getIlikePatternsForVariation = getIlikePatternsForNameVariant

/**
 * When profile lists a school, keep only NCHSAA rows whose `school` matches (substring, case-insensitive).
 * Rows with an empty `school` are ignored for this filter so we do not invent a match.
 * If no row matches, return the original list (typos in the table vs profile).
 */
export function filterNchsaaRowsBySchoolOptional(
  rows: NchsaaRowForProfile[],
  athleteHighSchool?: string
): NchsaaRowForProfile[] {
  const a = (athleteHighSchool ?? "").trim().toLowerCase()
  if (!a) return rows
  const filtered = rows.filter((r) => {
    const b = (r.school ?? "").toString().trim().toLowerCase()
    if (!b) return false
    return b.includes(a) || a.includes(b)
  })
  return filtered.length > 0 ? filtered : rows
}

/**
 * Fetch NCHSAA results for an athlete using the same logic as /api/wrestling-achievements
 * (name variations, ilike per variation, merge, placer-over-SQ). Use this so Blue list
 * and unified profiles show identical placement.
 * When graduationYear is provided, results are filtered to plausible tournament years only
 * (see `plausibleNchsaaYearsForGradYear`) so we don't merge a different person with the same name.
 * When highSchoolHint is set, rows are narrowed by `school` when at least one row matches (same idea as Super32).
 */
export async function getNCHSAAResultsForProfile(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear?: number,
  highSchoolHint?: string
): Promise<NchsaaRowForProfile[]> {
  if (!(athleteName ?? "").trim()) return []
  const yearRange = graduationYear ? plausibleNchsaaYearsForGradYear(graduationYear) : null
  const exactName = normalizeApostrophes(athleteName).trim()
  const seen = new Set<string>()
  const merged: NchsaaRowForProfile[] = []

  const pushRows = (data: any[]) => {
    for (const row of data ?? []) {
      const key = `${row.year}-${row.classification}-${row.weight_class}-${(row.wrestler_name ?? "").toString()}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push({
        year: Number(row.year),
        classification: (row.classification ?? "").toString(),
        weight_class: (row.weight_class ?? "").toString(),
        place: row.place != null ? Number(row.place) : null,
        school: (row.school ?? "").toString(),
        wrestler_name: (row.wrestler_name ?? "").toString(),
      })
    }
  }

  // First: dual-token ILIKE (first AND last) — matches "Thompson, Ryan" when display name is "Ryan Thompson"
  // (a single full-string ILIKE does not). No year filter on this query; see lib/nchsaa-profile-fetch.ts
  try {
    const dualTokenRows = await fetchNchsaaResultsForAthleteProfile(supabase, athleteName, {
      graduationYear: graduationYear,
    })
    pushRows(dualTokenRows as any[])
  } catch {
    // non-fatal — fall back to variants below
  }

  // Exact match first: "First Last" then "Last, First" (DB often has "D'Ettore, Jackson")
  let exactQuery = supabase
    .from("wrestling_nchsaa_results")
    .select("year, classification, weight_class, place, school, wrestler_name")
    .eq("wrestler_name", exactName)
  if (yearRange != null) {
    exactQuery = exactQuery.gte("year", yearRange.min).lte("year", yearRange.max)
  }
  const { data: exactData, error: exactErr } = await exactQuery.order("year", { ascending: false })
  if (!exactErr && exactData?.length) pushRows(exactData)

  const variations = getNameVariations(athleteName)
  const lastFirst = variations.find((n) => n.includes(","))
  if (lastFirst) {
    let lfQuery = supabase
      .from("wrestling_nchsaa_results")
      .select("year, classification, weight_class, place, school, wrestler_name")
      .eq("wrestler_name", lastFirst)
    if (yearRange != null) {
      lfQuery = lfQuery.gte("year", yearRange.min).lte("year", yearRange.max)
    }
    const { data: lfData, error: lfErr } = await lfQuery.order("year", { ascending: false })
    if (!lfErr && lfData?.length) pushRows(lfData)
  }

  for (const v of variations) {
    const patterns = getIlikePatternsForVariation(v)
    for (const pattern of patterns) {
      let q = supabase
        .from("wrestling_nchsaa_results")
        .select("year, classification, weight_class, place, school, wrestler_name")
        .ilike("wrestler_name", pattern)
      // Avoid PostgREST default row cap cutting off years; keep same window as plausible grad years
      if (yearRange != null) {
        q = q.gte("year", yearRange.min).lte("year", yearRange.max)
      }
      const { data, error } = await q.order("year", { ascending: false })
      if (error) throw error
      if (data?.length) pushRows(data)
    }
  }

  const matchContext: AthleteMatchContext = {
    displayName: athleteName,
    graduationYear: graduationYear ?? null,
    highSchool: highSchoolHint ?? null,
  }
  const hasLikelyNameMatch = merged.some((r) =>
    rowNameMatchesAthleteContext(r.wrestler_name, matchContext),
  )

  // Fallback: no rows or only wrong namesakes (e.g. "Max Davis" vs "Maxwell Davis" in DB)
  if (merged.length === 0 || !hasLikelyNameMatch) {
    const parts = normalizeApostrophes(athleteName).trim().split(/\s+/).filter(Boolean)
    const firstName = parts[0] ?? ""
    const lastName = parts.slice(1).join(" ")
    if (firstName && lastName) {
      const lastPatterns = getIlikePatternsForVariation(lastName)
      for (const lastPattern of lastPatterns) {
        let byLastQuery = supabase
          .from("wrestling_nchsaa_results")
          .select("year, classification, weight_class, place, school, wrestler_name")
          .ilike("wrestler_name", lastPattern)
        if (yearRange != null) {
          byLastQuery = byLastQuery.gte("year", yearRange.min).lte("year", yearRange.max)
        }
        const { data: byLast, error: errLast } = await byLastQuery.order("year", { ascending: false }).limit(100)
        if (!errLast && byLast?.length) {
          for (const row of byLast) {
            const wrestlerName = (row.wrestler_name ?? "").toString()
            if (!namesLikelySamePerson(wrestlerName, athleteName)) continue
            const key = `${row.year}-${row.classification}-${row.weight_class}-${wrestlerName.toLowerCase()}`
            if (seen.has(key)) continue
            seen.add(key)
            merged.push({
              year: Number(row.year),
              classification: (row.classification ?? "").toString(),
              weight_class: (row.weight_class ?? "").toString(),
              place: row.place != null ? Number(row.place) : null,
              school: (row.school ?? "").toString(),
              wrestler_name: wrestlerName,
            })
          }
          break
        }
      }
    }
  }

  merged.sort((a, b) => b.year - a.year)

  const byYear =
    yearRange != null
      ? merged.filter((r) => r.year >= yearRange.min && r.year <= yearRange.max)
      : merged

  const scoped = filterNchsaaRowsBySchoolOptional(byYear, highSchoolHint)

  const contextual = filterRowsByAthleteMatchContext(scoped, matchContext, (r) => ({
    name: r.wrestler_name,
    school: r.school,
    year: r.year,
  }))

  const placerKeys = new Set(
    contextual.filter((r) => r.place != null && r.place >= 1).map((r) => `${r.year}-${r.classification}-${r.weight_class}`)
  )
  return contextual.filter((r) => {
    if (r.place != null && r.place === 0) {
      if (placerKeys.has(`${r.year}-${r.classification}-${r.weight_class}`)) return false
    }
    return true
  })
}

/**
 * Fetch all 2026 NCHSAA results in one query. Use with getPlacement2026FromRows to avoid N+1 queries.
 */
export async function getAll2026Results(supabase: SupabaseClient): Promise<NchsaaRowForProfile[]> {
  const { data, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("year, classification, weight_class, place, school, wrestler_name")
    .eq("year", 2026)
    .order("classification")
    .order("weight_class")
  if (error) throw error
  return (data ?? []).map((row) => ({
    year: Number(row.year),
    classification: (row.classification ?? "").toString(),
    weight_class: (row.weight_class ?? "").toString(),
    place: row.place != null ? Number(row.place) : null,
    school: (row.school ?? "").toString(),
    wrestler_name: (row.wrestler_name ?? "").toString(),
  }))
}

/** Format a single 2026 placement for display (e.g. "1st 2A 132", "SQ"). */
export function formatPlacement2026(
  place: number | null,
  classification: string,
  weightClass: string
): string {
  if (place == null || place === 0) return "SQ"
  const ord = place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`
  return `${ord} ${classification} ${weightClass}`
}

/**
 * Compute 2026 placement string for one athlete from preloaded 2026 rows (no DB calls).
 * Uses same name-matching and placer-over-SQ logic as getNCHSAAResultsForProfile.
 */
export function getPlacement2026FromRows(
  rows2026: NchsaaRowForProfile[],
  athleteName: string,
  graduationYear?: number
): string | null {
  const name = (athleteName ?? "").trim()
  if (!name) return null
  const yearRange = graduationYear ? plausibleNchsaaYearsForGradYear(graduationYear) : null
  if (yearRange && (2026 < yearRange.min || 2026 > yearRange.max)) return null
  const variations = getNameVariations(name)
  const rowLower = (s: string) => (s ?? "").toLowerCase()
  const matched = rows2026.filter((row) => {
    const wn = rowLower(row.wrestler_name)
    return variations.some((v) => wn.includes(rowLower(v)) || rowLower(v).includes(wn))
  })
  if (matched.length === 0) return null
  const placerKeys = new Set(
    matched.filter((r) => r.place != null && r.place >= 1).map((r) => `${r.classification}-${r.weight_class}`)
  )
  const filtered = matched.filter((r) => {
    if (r.place != null && r.place === 0) {
      if (placerKeys.has(`${r.classification}-${r.weight_class}`)) return false
    }
    return true
  })
  const best = filtered.sort((a, b) => (a.place ?? 99) - (b.place ?? 99))[0]
  if (!best) return null
  return formatPlacement2026(best.place, best.classification, best.weight_class)
}

/** Merge two NCHSAA result lists (e.g. from name + wrestling_name), dedupe by year/classification/weight. */
export function mergeNchsaaResults(
  a: NchsaaRowForProfile[],
  b: NchsaaRowForProfile[]
): NchsaaRowForProfile[] {
  const keyOf = (row: NchsaaRowForProfile) =>
    `${row.year}-${row.classification}-${row.weight_class}`

  /** Higher = better for display (state placer beats SQ; better place wins). */
  const placeRank = (place: number | null): number => {
    if (place != null && place >= 1 && place <= 16) return 200 - place
    if (place === 0) return 50
    return 0
  }

  const pickBetter = (x: NchsaaRowForProfile, y: NchsaaRowForProfile) =>
    placeRank(y.place) > placeRank(x.place) ? y : x

  const byKey = new Map<string, NchsaaRowForProfile>()
  for (const row of [...a, ...b]) {
    const k = keyOf(row)
    const existing = byKey.get(k)
    byKey.set(k, existing ? pickBetter(existing, row) : row)
  }
  const out = [...byKey.values()].sort((x, y) => y.year - x.year)
  return out
}

/**
 * Overlay curated four-time state titles when the athlete matches a known 4× champ
 * (e.g. 2026 title not yet in `wrestling_nchsaa_results` or dropped by school filter).
 */
export function mergeCuratedFourTimeNchsaaIfMatch(
  rows: NchsaaRowForProfile[],
  displayName: string,
  wrestlingName?: string,
): NchsaaRowForProfile[] {
  const names = [displayName, wrestlingName].filter(Boolean) as string[]
  for (const champ of NCHSAA_FOUR_TIME_STATE_CHAMPIONS) {
    if (!names.some((n) => namesReferToSamePerson(n, champ.wrestler_name))) continue
    const curatedYears = new Set(champ.championships.map((c) => c.year))
    const withoutCuratedTitleYears = rows.filter(
      (r) => !(r.place === 1 && curatedYears.has(r.year)),
    )
    const curatedRows: NchsaaRowForProfile[] = champ.championships.map((c) => ({
      year: c.year,
      classification: c.classification,
      weight_class: c.weight_class,
      place: 1,
      school: c.school,
      wrestler_name: champ.wrestler_name,
    }))
    return mergeNchsaaResults(withoutCuratedTitleYears, curatedRows)
  }
  return rows
}

/** Merge NCHSAA table rows + athlete row JSON — same path as GET /api/athlete/[id] and wrestling-achievements. */
export async function getMergedNchsaaForAthlete(
  supabase: SupabaseClient,
  athlete: {
    name?: string | null
    wrestling_name?: string | null
    nchsaa_results?: unknown
    highschool?: string | null
    high_school?: string | null
    graduationyear?: number | null
  },
): Promise<NchsaaRowForProfile[]> {
  const displayName = String(athlete.name ?? "").trim()
  const wrestlingName = String(athlete.wrestling_name ?? "").trim()
  const gradYear = Number(athlete.graduationyear) || undefined
  const schoolHint = String(athlete.highschool ?? athlete.high_school ?? "").trim() || undefined

  const [byNameSchool, byWrestlingSchool, byNameWide, byWrestlingWide] = await Promise.all([
    getNCHSAAResultsForProfile(supabase, displayName, gradYear, schoolHint),
    wrestlingName && wrestlingName !== displayName
      ? getNCHSAAResultsForProfile(supabase, wrestlingName, gradYear, schoolHint)
      : Promise.resolve([] as NchsaaRowForProfile[]),
    getNCHSAAResultsForProfile(supabase, displayName, gradYear, undefined),
    wrestlingName && wrestlingName !== displayName
      ? getNCHSAAResultsForProfile(supabase, wrestlingName, gradYear, undefined)
      : Promise.resolve([] as NchsaaRowForProfile[]),
  ])
  const fromAthleteRow = nchsaaJsonToProfileRows(athlete.nchsaa_results, displayName || wrestlingName)
  const merged = mergeNchsaaResults(
    mergeNchsaaResults(
      mergeNchsaaResults(byNameSchool, byWrestlingSchool),
      mergeNchsaaResults(byNameWide, byWrestlingWide),
    ),
    fromAthleteRow,
  )
  return mergeCuratedFourTimeNchsaaIfMatch(merged, displayName, wrestlingName)
}

/**
 * Fetch NCHSAA state results for an athlete by name and graduation year.
 * Used for state champion / placer badge logic.
 */
export async function getNCHSAAResults(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear: number
): Promise<{ year: number; place: number; classification?: string }[]> {
  if (!graduationYear || isNaN(graduationYear)) return []

  const currentYear = new Date().getFullYear()
  const yearsRemaining = graduationYear - currentYear

  // Use athlete's full high-school window (gradYear-4 .. gradYear) for seniors/graduated so we show all 4 years (e.g. Charlie Sly).
  // Underclassmen: only search years that could already have results (no future years).
  let yearsToSearch: number[]
  if (yearsRemaining >= 3) yearsToSearch = [currentYear]
  else if (yearsRemaining === 2) yearsToSearch = [currentYear, currentYear - 1]
  else if (yearsRemaining === 1) yearsToSearch = [currentYear, currentYear - 1, currentYear - 2]
  else {
    const minY = Math.max(1990, graduationYear - 4)
    const maxY = Math.min(graduationYear, currentYear)
    yearsToSearch = []
    for (let y = minY; y <= maxY; y++) yearsToSearch.push(y)
  }

  const namePattern = `%${escapeForIlike(athleteName)}%`
  const { data: results, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("year, place, classification")
    .ilike("wrestler_name", namePattern)
    .in("year", yearsToSearch)
    .order("year", { ascending: false })

  if (error) return []
  return (results || []).map((r) => ({
    year: Number(r.year),
    place: Number(r.place) || 0,
    classification: r.classification ?? undefined,
  }))
}
