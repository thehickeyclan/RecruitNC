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

/** Same name variations as /api/wrestling-achievements (unified profile NCHSAA). Includes apostrophe-free variant (e.g. D'Ettore → Dettore) so we match DB spellings either way. */
export function getNameVariations(name: string): string[] {
  const n = (name ?? "").trim()
  if (!n) return []
  const variations = [n]
  const noApostrophe = n.replace(/'/g, "").trim()
  if (noApostrophe && noApostrophe !== n) variations.push(noApostrophe)
  if (n.includes(",")) {
    const [last, first] = n.split(",").map((s) => s.trim())
    if (first && last) variations.push(`${first} ${last}`)
  } else {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const first = parts[0]!
      const last = parts.slice(1).join(" ")
      variations.push(`${last}, ${first}`)
    }
  }
  return [...new Set(variations)]
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
 * Fetch NCHSAA results for an athlete using the same logic as /api/wrestling-achievements
 * (name variations, ilike per variation, merge, placer-over-SQ). Use this so Blue list
 * and unified profiles show identical placement.
 */
export async function getNCHSAAResultsForProfile(
  supabase: SupabaseClient,
  athleteName: string
): Promise<NchsaaRowForProfile[]> {
  if (!(athleteName ?? "").trim()) return []
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

  const placerKeys = new Set(
    merged.filter((r) => r.place != null && r.place >= 1).map((r) => `${r.year}-${r.classification}-${r.weight_class}`)
  )
  return merged.filter((r) => {
    if (r.place != null && r.place === 0) {
      if (placerKeys.has(`${r.year}-${r.classification}-${r.weight_class}`)) return false
    }
    return true
  })
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

  let yearsToSearch: number[]
  if (yearsRemaining >= 3) yearsToSearch = [currentYear]
  else if (yearsRemaining === 2) yearsToSearch = [currentYear, currentYear - 1]
  else if (yearsRemaining === 1) yearsToSearch = [currentYear, currentYear - 1, currentYear - 2]
  else yearsToSearch = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]

  const { data: results, error } = await supabase
    .from("wrestling_nchsaa_results")
    .select("year, place, classification")
    .ilike("wrestler_name", `%${athleteName}%`)
    .in("year", yearsToSearch)
    .order("year", { ascending: false })

  if (error) return []
  return (results || []).map((r) => ({
    year: Number(r.year),
    place: Number(r.place) || 0,
    classification: r.classification ?? undefined,
  }))
}
