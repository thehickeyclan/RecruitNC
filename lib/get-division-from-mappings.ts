import { createAdminClient } from "@/lib/supabase/admin"
import { standardizeDivision } from "@/lib/division-standardizer"
import { CANONICAL_DIVISIONS_FULL, type CanonicalDivisionFull } from "@/lib/division-display"

/** Re-export for consumers that need the list. Spell out NCAA; Roman numerals I, II, III. */
export const CANONICAL_DIVISIONS = CANONICAL_DIVISIONS_FULL
export type CanonicalDivision = CanonicalDivisionFull

// Cache: college name (lowercase) -> canonical division
let divisionMappingsCache: Record<string, string> | null = null
let lastCacheUpdate = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Fallback: correct division when DB has wrong/duplicate rows. Key = lowercase college name or partial.
const FALLBACK_DIVISION: Record<string, string> = {
  "roanoke": "NCAA Division III",
  "roanoke college": "NCAA Division III",
  "lander": "NCAA Division II",
  "lander university": "NCAA Division II",
  "presbyterian": "NCAA Division I",
  "presbyterian college": "NCAA Division I",
  "mount union": "NCAA Division III",
  "university of mount union": "NCAA Division III",
  "belmont abbey": "NCAA Division II",
}

/**
 * Resolve a college name to a canonical division.
 * Single source of truth: college_division_mappings only. To fix wrong divisions, update that table in Supabase.
 * When a college is NOT in the table, returns "" so callers can fall back to athlete.division (avoids "Unknown" everywhere when table is incomplete).
 */
export async function getDivisionFromMappings(collegeName: string): Promise<string> {
  const raw = collegeName?.trim()
  if (!raw) return ""

  if (!divisionMappingsCache || Date.now() - lastCacheUpdate > CACHE_TTL) {
    await refreshDivisionMappingsCache()
  }

  if (!divisionMappingsCache) return ""

  const collegeLower = raw.toLowerCase()

  // Resolve common aliases to a name we have in the table
  const aliasToCanonical: Record<string, string> = {
    "unc": "unc chapel hill",
    "north carolina": "unc chapel hill",
    "university of north carolina": "unc chapel hill",
    "nc state": "nc state",
    "north carolina state": "nc state",
    "ncsu": "nc state",
    "app state": "appalachian state",
    "appalachian": "appalachian state",
    "uncp": "unc pembroke",
    "pembroke": "unc pembroke",
    "wake tech": "wake tech",
    "waketech": "wake tech",
    "gardner webb": "gardner-webb",
    "gardner-webb": "gardner-webb",
    "roanoke": "roanoke",
    "roanoke college": "roanoke college",
    "lander": "lander",
    "presbyterian": "presbyterian",
    "mount union": "mount union",
  }
  const lookupName = aliasToCanonical[collegeLower] ?? collegeLower

  // Exact match
  let division = divisionMappingsCache[lookupName]

  // Partial match (e.g. "Appalachian State University" vs "App State")
  if (!division) {
    const keys = Object.keys(divisionMappingsCache)
    const matchingKey = keys.find(
      (key) => lookupName.includes(key) || key.includes(lookupName),
    )
    if (matchingKey) division = divisionMappingsCache[matchingKey]
  }

  // These schools: always use correct division (DB often has wrong/duplicate rows)
  for (const [key, fallbackDiv] of Object.entries(FALLBACK_DIVISION)) {
    if (key === collegeLower || collegeLower.includes(key) || key.includes(collegeLower)) {
      return fallbackDiv
    }
  }

  const normalized = division ? standardizeDivision(division) : ""
  return CANONICAL_DIVISIONS.includes(normalized as CanonicalDivision) ? normalized : ""
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
        const div = toCanonical(row.division ?? "")
        if (name && div) merged[name] = div
      }
    }

    divisionMappingsCache = merged
    lastCacheUpdate = Date.now()
  } catch (error) {
    console.error("Error refreshing division mappings cache:", error)
    divisionMappingsCache = divisionMappingsCache ?? {}
  }
}
