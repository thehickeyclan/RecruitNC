import { createAdminClient } from "@/lib/supabase/admin"
import { CANONICAL_DIVISIONS_FULL, type CanonicalDivisionFull } from "@/lib/division-display"

export const CANONICAL_DIVISIONS = CANONICAL_DIVISIONS_FULL
export type CanonicalDivision = CanonicalDivisionFull

let cache: Map<string, string> | null = null
let cacheTime = 0
const CACHE_MS = 30 * 1000 // 30s so pages always get fresh divisions after deploy

export function clearDivisionMappingsCache(): void {
  cache = null
  cacheTime = 0
}

/** Override so D2/D3 show correctly even if DB has wrong data. */
const DIVISION_OVERRIDES: Record<string, string> = {
  "roanoke college": "NCAA Division III",
  roanoke: "NCAA Division III",
  "belmont abbey": "NCAA Division II",
  lander: "NCAA Division II",
  "mount union": "NCAA Division III",
}

/**
 * Get division for a college from college_division_mappings table.
 * Match: exact lowercase, or DB name contained in input, or input contained in DB name (e.g. "University of Mount Olive" -> "Mount Olive" row).
 */
export async function getDivisionFromMappings(collegeName: string): Promise<string> {
  const raw = (collegeName ?? "").trim()
  if (!raw) return ""

  if (!cache || Date.now() - cacheTime > CACHE_MS) {
    const supabase = createAdminClient()
    const { data: rows, error } = await supabase
      .from("college_division_mappings")
      .select("college_name, division")

    cache = new Map()
    if (!error && rows?.length) {
      for (const row of rows) {
        const r = row as { college_name?: string; collegeName?: string; division?: string }
        const name = (r.college_name ?? r.collegeName ?? "").toString().trim()
        const div = (r.division ?? "").toString().trim()
        if (name && div) cache.set(name.toLowerCase(), div)
      }
    }
    for (const [k, v] of Object.entries(DIVISION_OVERRIDES)) cache.set(k, v)
    cacheTime = Date.now()
  }

  if (!cache?.size) return ""

  const key = raw.toLowerCase()
  let division = cache.get(key)
  if (division) return division

  // Prefer longest matching key so "Roanoke College" wins over "Roanoke", "Belmont Abbey" over "Abbey"
  let bestKey = ""
  let bestDivision = ""
  for (const [dbKey, div] of cache) {
    if (!(key.includes(dbKey) || dbKey.includes(key))) continue
    if (dbKey.length > bestKey.length) {
      bestKey = dbKey
      bestDivision = div
    }
  }
  return bestDivision
}
