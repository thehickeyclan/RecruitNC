/**
 * NCHSAA high school classification (1A–8A).
 * Canonical sources: school_classifications DB table, or static overview data.
 */

import { nchsaaClassificationOverviewData } from "./nchsaa-classification-overview-data"

export const VALID_CLASSIFICATIONS = ["1A", "2A", "3A", "4A", "5A", "6A", "7A", "8A", "1A/2A"] as const

/**
 * Static fallback school display names by classification (from NCHSAA overview data).
 * Used when `school_classifications` returns no rows.
 */
export function getSchoolsByClassification(classification: string): string[] {
  const raw = classification.trim().toUpperCase().replace(/\s/g, "")
  const m = raw.match(/^(\d+)A$/)
  if (!m) return []
  const key = `${m[1]}A` as keyof typeof nchsaaClassificationOverviewData
  const schools = nchsaaClassificationOverviewData[key]?.schools
  if (!schools?.length) return []
  return [...schools]
}

/**
 * Find a school's classification from school_classifications table (authoritative DB source).
 */
export async function findSchoolClassification(
  supabase: { from: (t: string) => any },
  schoolName: string,
): Promise<string | null> {
  if (!schoolName?.trim()) return null
  try {
    const norm = schoolName.trim()
    const { data, error } = await supabase
      .from("school_classifications")
      .select("classification")
      .ilike("school_name", norm)
      .limit(1)
      .maybeSingle()
    if (!error && data?.classification) return data.classification

    const clean = norm.replace(/\s+(high\s+school|hs|academy|charter|prep|school)$/i, "").trim()
    const { data: fuzzy } = await supabase
      .from("school_classifications")
      .select("classification")
      .ilike("school_name", `%${clean}%`)
      .limit(1)
      .maybeSingle()
    return fuzzy?.classification ?? null
  } catch {
    return null
  }
}

/**
 * Batch lookup: map school names to their classification.
 * Uses school_classifications table (1A–8A, 1A/2A).
 */
export async function buildSchoolClassificationMap(
  supabase: { from: (t: string) => any },
  schoolNames: string[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const unique = [...new Set(schoolNames.filter(Boolean).map((s) => (s || "").trim()))]
  if (unique.length === 0) return map
  try {
    const { data: rows, error } = await supabase
      .from("school_classifications")
      .select("school_name, classification")
    if (error || !rows?.length) return map
    for (const school of unique) {
      const lower = school.toLowerCase()
      const match = rows.find((r: { school_name?: string }) => {
        const rn = (r.school_name || "").toLowerCase()
        return rn === lower || rn.includes(lower) || lower.includes(rn)
      })
      if (match?.classification) map[school] = match.classification
      else {
        const clean = school.replace(/\s+(high\s+school|hs|academy|charter|prep|school)$/i, "").trim()
        const fuzzy = rows.find((r: { school_name?: string }) =>
          (r.school_name || "").toLowerCase().includes(clean.toLowerCase()),
        )
        if (fuzzy?.classification) map[school] = fuzzy.classification
      }
    }
  } catch {
    // school_classifications may not exist
  }
  return map
}
