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
      for (const row of mappingRows) {
        const name = (row.college_name ?? "").toString().trim().toLowerCase()
        const rawDiv = (row.division ?? "").toString().trim()
        const div = toCanonical(rawDiv) || (rawDiv.toLowerCase() === "unknown" ? "Unknown" : "")
        if (name && div) merged[name] = div
      }
      // So "Mount Olive" and "University of Mount Olive" both resolve to same division from DB
      for (const key of Object.keys(merged)) {
        const div = merged[key]
        const row = mappingRows?.find((r) => (r.college_name ?? "").toString().trim().toLowerCase() === key)
        const canonical = row ? normalizeCollegeToCanonical(row.college_name) : ""
        if (canonical) {
          for (const variant of getLookupKeysForCanonical(canonical)) {
            merged[variant] = div
          }
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
