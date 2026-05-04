import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchNchsaaResultsForAthleteProfile } from "@/lib/nchsaa-profile-fetch"

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

/** Curly apostrophe (Unicode) — NCHSAA/source data sometimes stores names with this. */
const CURLY_APOSTROPHE = "\u2019"

/** Return ilike patterns for a name so we match DB: straight/curly apostrophe and backtick (same as Data Dawg). */
function getIlikePatternsForVariation(v: string): string[] {
  const escaped = "%" + escapeForIlike(v) + "%"
  const patterns = [escaped]
  if (v.includes("'")) {
    patterns.push("%" + v.replace(/'/g, CURLY_APOSTROPHE) + "%")
    patterns.push("%" + v.replace(/'/g, "`") + "%")
  }
  return patterns
}

/**
 * Known same-person name spellings (e.g. NCHSAA or source data typo vs athlete profile).
 * Each group lists all spellings that refer to the same athlete; we query for all so placements pull in.
 */
/**
 * Add spellings here when NCHSAA/source data uses a different name than the athlete profile
 * (e.g. Quickny vs Quincy, or Furmann vs Furman). Use /api/nchsaa-lookup?name=First+Last&year=2026
 * to see raw wrestler_name values for a given last name and add any missing spellings.
 */
const SAME_PERSON_NAME_ALIASES: string[][] = [
  ["Holt Quincy", "Holton Quincy", "Holt Quickny", "Holton Quickny"],
  ["Colt Cambruzzi", "Colt Cambruzi", "Cole Cambruzzi", "Cole Cambruzi"],
  ["Carter Furman", "Carter Furmann", "Carter Forman"],
  ["Miller Menteer", "Miller Mentzer"],
  ["Nevaeh Williamson", "Nevaeh Willamson"],
  ["Cam Stinson", "Cameron Stinson"],
  ["Jackson D'Ettore", "Jackson Dettore", "Jackson D\u2019Ettore"],
]

function normalizeForAlias(name: string): string {
  return normalizeApostrophes((name ?? "")
    .trim()
    .toLowerCase()
    .replace(/`/g, "'")
    .replace(/,/g, " "))
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
}

/** Normalize Unicode/smart apostrophes to straight quote so matching works (e.g. "D'Ettore" from forms). */
function normalizeApostrophes(s: string): string {
  return (s ?? "")
    .replace(/\u2019/g, "'") // RIGHT SINGLE QUOTATION MARK
    .replace(/\u2018/g, "'") // LEFT SINGLE QUOTATION MARK
}

/** Same name variations as /api/wrestling-achievements (unified profile NCHSAA). Includes apostrophe-free variant (e.g. D'Ettore → Dettore) and known same-person spelling aliases (e.g. Holt Quickny ↔ Holt Quincy) so we match DB spellings either way. Treats backtick as apostrophe so "Jackson D`Ettore" matches. */
export function getNameVariations(name: string): string[] {
  const n = normalizeApostrophes((name ?? "").trim())
  if (!n) return []
  const variations = new Set<string>([n])
  const withApostrophe = n.replace(/`/g, "'")
  if (withApostrophe !== n) variations.add(withApostrophe)

  const addVariantsFor = (fullName: string) => {
    variations.add(fullName)
    const noApostrophe = fullName.replace(/'/g, "").replace(/`/g, "").trim()
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
 * Map `athletes.nchsaa_results` JSON/JSONB (array of state rows) into the same shape as table rows.
 * Used when `wrestling_nchsaa_results` is empty, missing in this Supabase project, or as a supplement.
 */
export function nchsaaJsonToProfileRows(raw: unknown, fallbackWrestlerName: string): NchsaaRowForProfile[] {
  if (raw == null) return []
  let arr: unknown[] = []
  if (Array.isArray(raw)) {
    arr = raw
  } else if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw)
      arr = Array.isArray(p) ? p : []
    } catch {
      return []
    }
  } else {
    return []
  }

  const name = (fallbackWrestlerName ?? "").trim() || "Unknown"
  const out: NchsaaRowForProfile[] = []
  for (const item of arr) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const year = Number(o.year)
    if (!year || Number.isNaN(year)) continue
    const placeRaw = o.place
    const place =
      placeRaw == null || placeRaw === ""
        ? null
        : Number(placeRaw)
    out.push({
      year,
      classification: String(o.classification ?? (o as any).class ?? ""),
      weight_class: String(o.weight_class ?? (o as any).weightClass ?? ""),
      place: place != null && !Number.isNaN(place) ? place : null,
      school: String(o.school ?? ""),
      wrestler_name: String(o.wrestler_name ?? (o as any).wrestlerName ?? name),
    })
  }
  return out.sort((a, b) => b.year - a.year)
}

/**
 * Plausible NCHSAA tournament years for a graduation year.
 * Upper bound keeps late entries; lower bound must include early high-school / middle-school state years
 * (e.g. **2026 SQ with class of 2031+** was dropped when min was only `gradYear - 4`).
 */
export function plausibleNchsaaYearsForGradYear(graduationYear: number): { min: number; max: number } {
  const y = Number(graduationYear)
  if (!y || isNaN(y)) return { min: 0, max: 9999 }
  const maxYear = Math.min(2035, y + 2)
  const minYear = Math.max(1990, y - 14)
  return { min: minYear, max: maxYear }
}

/**
 * Fetch NCHSAA results for an athlete using the same logic as /api/wrestling-achievements
 * (name variations, ilike per variation, merge, placer-over-SQ). Use this so Blue list
 * and unified profiles show identical placement.
 * When graduationYear is provided, results are filtered to plausible tournament years only
 * (see `plausibleNchsaaYearsForGradYear`) so we don't merge a different person with the same name.
 */
export async function getNCHSAAResultsForProfile(
  supabase: SupabaseClient,
  athleteName: string,
  graduationYear?: number
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

  // Fallback: if nothing matched (e.g. "Max Davis" vs "Maxwell Davis" in DB), try last name + first-name substring
  if (merged.length === 0) {
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
