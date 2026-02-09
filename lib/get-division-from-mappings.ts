import { createAdminClient } from "@/lib/supabase/admin"
import { CANONICAL_DIVISIONS_FULL, type CanonicalDivisionFull } from "@/lib/division-display"

export const CANONICAL_DIVISIONS = CANONICAL_DIVISIONS_FULL
export type CanonicalDivision = CanonicalDivisionFull

let cache: Map<string, string> | null = null
let cacheTime = 0
const CACHE_MS = 5 * 60 * 1000

export function clearDivisionMappingsCache(): void {
  cache = null
  cacheTime = 0
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
    cacheTime = Date.now()
  }

  if (!cache?.size) return ""

  const key = raw.toLowerCase()
  let division = cache.get(key)
  if (division) return division

  for (const [dbKey, div] of cache) {
    if (key.includes(dbKey) || dbKey.includes(key)) return div
  }
  return ""
}
