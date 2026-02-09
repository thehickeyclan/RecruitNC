import { createAdminClient } from "@/lib/supabase/admin"
import { standardizeDivision } from "@/lib/division-standardizer"
import { CANONICAL_DIVISIONS_FULL, type CanonicalDivisionFull } from "@/lib/division-display"
import { collegeToLookupKey, getLookupKeysForCanonical, normalizeCollegeToCanonical } from "@/lib/canonical-college"

/** Re-export for consumers that need the list. */
export const CANONICAL_DIVISIONS = CANONICAL_DIVISIONS_FULL
export type CanonicalDivision = CanonicalDivisionFull

// Cache: lookup key (lowercase) -> canonical division. Refreshed from DB only.
let divisionMappingsCache: Record<string, string> | null = null
let lastCacheUpdate = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function clearDivisionMappingsCache(): void {
  divisionMappingsCache = null
  lastCacheUpdate = 0
}

/**
 * Single source of truth: college_division_mappings table only.
 * Resolves college name via canonical aliases (NCSU → NC State, etc.) then looks up in table.
 * Returns "" if college is not in the table — add it in the DB and set the correct division.
 */
export async function getDivisionFromMappings(collegeName: string): Promise<string> {
  const raw = collegeName?.trim()
  if (!raw) return ""

  if (!divisionMappingsCache || Date.now() - lastCacheUpdate > CACHE_TTL) {
    await refreshDivisionMappingsCache()
  }

  if (!divisionMappingsCache) return ""

  const lookupKey = collegeToLookupKey(raw)

  let division = divisionMappingsCache[lookupKey]

  if (!division) {
    const keys = Object.keys(divisionMappingsCache)
    const matchingKey = keys.find(
      (key) => lookupKey.includes(key) || key.includes(lookupKey),
    )
    if (matchingKey) division = divisionMappingsCache[matchingKey]
  }

  if (!division) return ""
  const normalized = standardizeDivision(division)
  if (CANONICAL_DIVISIONS.includes(normalized as CanonicalDivision)) return normalized
  if ((division || "").trim().toLowerCase() === "unknown") return "Unknown"
  return ""
}

async function refreshDivisionMappingsCache() {
  const supabase = createAdminClient()
  const merged: Record<string, string> = {}

  try {
    const { data: mappingRows, error: mapError } = await supabase
      .from("college_division_mappings")
      .select("college_name, division")

    const toCanonical = (d: string) => {
      const s = standardizeDivision(d)
      return CANONICAL_DIVISIONS.includes(s as CanonicalDivision) ? s : ""
    }

    if (!mapError && mappingRows?.length) {
      // One division per canonical school. If we have both "Mount Olive" = DII and
      // "University of Mount Olive" = DI, prefer the row whose name is the canonical form.
      const canonicalToDivision: Record<string, string> = {}
      for (const row of mappingRows) {
        const rawName = (row.college_name ?? "").toString().trim()
        const rawDiv = (row.division ?? "").toString().trim()
        const div = toCanonical(rawDiv) || (rawDiv.toLowerCase() === "unknown" ? "Unknown" : "")
        if (!rawName || !div) continue
        const canonical = normalizeCollegeToCanonical(rawName)
        const isCanonicalRow = rawName.toLowerCase() === canonical.toLowerCase()
        if (!canonicalToDivision[canonical] || isCanonicalRow) canonicalToDivision[canonical] = div
      }
      // Spread to all variant keys so "Mount Olive" and "University of Mount Olive" resolve the same
      for (const [canonical, div] of Object.entries(canonicalToDivision)) {
        for (const variant of getLookupKeysForCanonical(canonical)) {
          merged[variant] = div
        }
      }
    }

    divisionMappingsCache = merged
    lastCacheUpdate = Date.now()
  } catch (error) {
    console.error("Error refreshing division mappings cache:", error)
    divisionMappingsCache = divisionMappingsCache ?? {}
  }
}
