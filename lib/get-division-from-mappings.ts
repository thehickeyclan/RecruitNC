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

/**
 * Resolve a college name to a canonical division using the single source of truth:
 * college_division_mappings (primary) and college_master + college_aliases (fallback).
 * Always returns one of: NCAA Division I, NCAA Division II, NCAA Division III, NAIA, NJCAA, Club (NCWA), or Unknown.
 */
export async function getDivisionFromMappings(collegeName: string): Promise<string> {
  const raw = collegeName?.trim()
  if (!raw) return "Unknown"

  if (!divisionMappingsCache || Date.now() - lastCacheUpdate > CACHE_TTL) {
    await refreshDivisionMappingsCache()
  }

  if (!divisionMappingsCache) return "Unknown"

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

  const normalized = division ? standardizeDivision(division) : ""
  return CANONICAL_DIVISIONS.includes(normalized as CanonicalDivision) ? normalized : "Unknown"
}

async function refreshDivisionMappingsCache() {
  const supabase = createAdminClient()
  const merged: Record<string, string> = {}

  try {
    // 1) college_division_mappings — primary source
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

    // 2) college_master + college_aliases — fallback so one source has all colleges
    const { data: masters, error: masterError } = await supabase
      .from("college_master")
      .select("id, canonical_name, display_name, division")

    if (!masterError && masters?.length) {
      const idToDivision: Record<number, string> = {}
      for (const m of masters) {
        const div = toCanonical(m.division ?? "")
        idToDivision[m.id] = div
        const can = (m.canonical_name ?? "").toString().trim().toLowerCase()
        const dis = (m.display_name ?? "").toString().trim().toLowerCase()
        if (can && div && !merged[can]) merged[can] = div
        if (dis && div && dis !== can && !merged[dis]) merged[dis] = div
      }

      const { data: aliases } = await supabase
        .from("college_aliases")
        .select("alias_name, college_master_id")

      if (aliases?.length) {
        for (const a of aliases) {
          const div = idToDivision[a.college_master_id]
          if (div) {
            const al = (a.alias_name ?? "").toString().trim().toLowerCase()
            if (al && !merged[al]) merged[al] = div
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
