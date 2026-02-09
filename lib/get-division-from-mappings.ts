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
 * Single source of truth: college_divisions table (admin "simple division mapping").
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

function buildMergedFromRows(
  rows: { college_name?: unknown; division?: unknown; collegeName?: unknown }[],
  toCanonical: (d: string) => string,
): Record<string, string> {
  const merged: Record<string, string> = {}
  if (!rows?.length) return merged
  const canonicalToDivision: Record<string, string> = {}
  for (const row of rows) {
    // Support both snake_case (Supabase default) and camelCase
    const rawName = (
      (row.college_name ?? row.collegeName ?? "") as string
    ).toString().trim()
    const rawDiv = (row.division ?? "").toString().trim()
    if (!rawName) continue
    // Use canonical division if recognized; otherwise keep standardized or raw so we don't drop rows
    const div =
      toCanonical(rawDiv) ||
      (rawDiv.toLowerCase() === "unknown" ? "Unknown" : "") ||
      standardizeDivision(rawDiv) ||
      rawDiv
    if (!div) continue
    const canonical = normalizeCollegeToCanonical(rawName)
    const isCanonicalRow = rawName.toLowerCase() === canonical.toLowerCase()
    if (!canonicalToDivision[canonical] || isCanonicalRow) canonicalToDivision[canonical] = div
  }
  for (const [canonical, div] of Object.entries(canonicalToDivision)) {
    // Always add exact canonical key (lowercase) so DB names match
    const cLower = canonical.toLowerCase()
    merged[cLower] = div
    for (const variant of getLookupKeysForCanonical(canonical)) {
      merged[variant] = div
    }
  }
  return merged
}

async function refreshDivisionMappingsCache() {
  const supabase = createAdminClient()
  const toCanonical = (d: string) => {
    const s = standardizeDivision(d)
    return CANONICAL_DIVISIONS.includes(s as CanonicalDivision) ? s : ""
  }

  try {
    // Primary: college_divisions (admin simple mapping)
    const { data: divisionsRows, error: divError } = await supabase
      .from("college_divisions")
      .select("college_name, division")

    let merged = buildMergedFromRows(divisionsRows ?? [], toCanonical)

    // Fallback: if college_divisions empty or failed, use college_division_mappings so divisions don't all show Unknown
    if (Object.keys(merged).length === 0 || divError) {
      const { data: mappingRows, error: mapError } = await supabase
        .from("college_division_mappings")
        .select("college_name, division")
      if (!mapError && mappingRows?.length) {
        merged = buildMergedFromRows(mappingRows, toCanonical)
      }
    } else if (Object.keys(merged).length > 0) {
      // college_divisions had data; fill any missing colleges from college_division_mappings
      const { data: mappingRows } = await supabase
        .from("college_division_mappings")
        .select("college_name, division")
      const fromMappings = buildMergedFromRows(mappingRows ?? [], toCanonical)
      for (const [key, div] of Object.entries(fromMappings)) {
        if (!merged[key]) merged[key] = div
      }
    }

    divisionMappingsCache = merged
    lastCacheUpdate = Date.now()
  } catch (error) {
    console.error("Error refreshing division mappings cache:", error)
    divisionMappingsCache = divisionMappingsCache ?? {}
  }
}
