import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Normalize name for matching: same person "Aaron Ellison" and "Ellison, Aaron" => same string.
 * Used so NCHSAA rows match athletes regardless of "First Last" vs "Last, First" in DB.
 */
export function namesReferToSamePerson(nameA: string, nameB: string): boolean {
  const norm = (s: string) =>
    (s ?? "")
      .trim()
      .toLowerCase()
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(" ")
  return norm(nameA) === norm(nameB) && norm(nameA) !== ""
}

/** Escape single quotes for safe use in Supabase ilike (e.g. "D'Ettore" => "D''Ettore"). */
export function escapeForIlike(s: string): string {
  return (s ?? "").replace(/'/g, "''")
}

/**
 * Known same-person name spellings (e.g. NCHSAA or source data typo vs athlete profile).
 * Each group lists all spellings that refer to the same athlete; we query for all so placements pull in.
 */
/**
 * Add spellings here when NCHSAA/source data uses a different name than the athlete profile
 * (e.g. Quickny vs Quincy, or Furmann vs Furman). Use /api/debug/nchsaa-lookup?name=First+Last&year=2026
 * to see raw wrestler_name values for a given last name and add any missing spellings.
 */
const SAME_PERSON_NAME_ALIASES: string[][] = [
  ["Holt Quincy", "Holton Quincy", "Holt Quickny", "Holton Quickny"],
  ["Colt Cambruzzi", "Colt Cambruzi", "Cole Cambruzzi", "Cole Cambruzi"],
  ["Carter Furman", "Carter Furmann", "Carter Forman"],
  ["Miller Menteer", "Miller Mentzer"],
  ["Nevaeh Williamson", "Nevaeh Willamson"],
  ["Cam Stinson", "Cameron Stinson"],
  ["Jackson D'Ettore", "Jackson Dettore"],
]

function normalizeForAlias(name: string): string {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
}

/** Same name variations as /api/wrestling-achievements (unified profile NCHSAA). Includes apostrophe-free variant (e.g. D'Ettore → Dettore) and known same-person spelling aliases (e.g. Holt Quickny ↔ Holt Quincy) so we match DB spellings either way. */
export function getNameVariations(name: string): string[] {
  const n = (name ?? "").trim()
  if (!n) return []
  const variations = new Set<string>([n])

  const addVariantsFor = (fullName: string) => {
    variations.add(fullName)
    const noApostrophe = fullName.replace(/'/g, "").trim()
    if (noApostrophe && noApostrophe !== fullName) variations.add(noApostrophe)
    if (fullName.includes(",")) {
      const [last, first] = fullName.split(",").map((s) => s.trim())
      if (first && last) variations.add(`${first} ${last}`)
    } else {
      const parts = fullName.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) {
        const first = parts[0]!
        const last = parts.slice(1).join(" ")
        variations.add(`${last}, ${first}`)
      }
    }
  }

  const key = normalizeForAlias(n)
  for (const group of SAME_PERSON_NAME_ALIASES) {
    const inGroup = group.some((s) => normalizeForAlias(s) === key)
    if (inGroup) {
      for (const spelling of group) addVariantsFor(spelling.trim())
      break
    }
  }

  addVariantsFor(n)
  return [...variations]
}

export type NchsaaRowForProfile = {
  year: number
  classification: string
  weight_class: string
  place: number | null
  school: string
  wrestler_name: string
}

/**
 * Plausible NCHSAA tournament years for a graduation year (high school: gradYear-4 through gradYear).
 * Used to avoid merging a different person with the same name (e.g. two Jacob Perrys).
 */
export function plausibleNchsaaYearsForGradYear(graduationYear: number): { min: number; max: number } {
  const y = Number(graduationYear)
  if (!y || isNaN(y)) return { min: 0, max: 9999 }
  return { min: Math.max(1990, y - 4), max: y }
}

/**
 * Fetch NCHSAA results for an athlete using the same logic as /api/wrestling-achievements
 * (name variations, ilike per variation, merge, placer-over-SQ). Use this so Blue list
 * and unified profiles show identical placement.
 * When graduationYear is provided, results are filtered to plausible high-school years only
 * (gradYear-4 through gradYear) so we don't merge a different person with the same name.
 */
export async function getNCHSAAResultsForProfile(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear?: number
): Promise<NchsaaRowForProfile[]> {
  if (!(athleteName ?? "").trim()) return []
  const yearRange = graduationYear ? plausibleNchsaaYearsForGradYear(graduationYear) : null
  const variations = getNameVariations(athleteName)
  const seen = new Set<string>()
  const merged: NchsaaRowForProfile[] = []

  for (const v of variations) {
    const pattern = "%" + escapeForIlike(v) + "%"
    const { data, error } = await supabase
      .from("wrestling_nchsaa_results")
      .select("year, classification, weight_class, place, school, wrestler_name")
      .ilike("wrestler_name", pattern)
      .order("year", { ascending: false })
    if (error) throw error
    if (!data?.length) continue
    for (const row of data) {
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

  // Fallback: if nothing matched (e.g. "Max Davis" vs "Maxwell Davis" in DB), try last name + first-name substring
  if (merged.length === 0) {
    const parts = athleteName.trim().split(/\s+/).filter(Boolean)
    const firstName = parts[0] ?? ""
    const lastName = parts.slice(1).join(" ")
    if (firstName && lastName) {
      const lastPattern = `%${escapeForIlike(lastName)}%`
      const { data: byLast, error: errLast } = await supabase
        .from("wrestling_nchsaa_results")
        .select("year, classification, weight_class, place, school, wrestler_name")
        .ilike("wrestler_name", lastPattern)
        .order("year", { ascending: false })
        .limit(100)
      if (!errLast && byLast?.length) {
        const firstLower = firstName.toLowerCase()
        for (const row of byLast) {
          const rn = (row.wrestler_name ?? "").toString().toLowerCase()
          if (!rn.includes(firstLower)) continue
          const key = `${row.year}-${row.classification}-${row.weight_class}-${rn}`
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
    }
  }

  merged.sort((a, b) => b.year - a.year)

  const byYear =
    yearRange != null
      ? merged.filter((r) => r.year >= yearRange.min && r.year <= yearRange.max)
      : merged

  const placerKeys = new Set(
    byYear.filter((r) => r.place != null && r.place >= 1).map((r) => `${r.year}-${r.classification}-${r.weight_class}`)
  )
  return byYear.filter((r) => {
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
  const seen = new Set<string>()
  const out: NchsaaRowForProfile[] = []
  for (const row of [...a, ...b]) {
    const key = `${row.year}-${row.classification}-${row.weight_class}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  out.sort((x, y) => y.year - x.year)
  return out
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
