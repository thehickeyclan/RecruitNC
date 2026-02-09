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

/**
 * Read college_name and division from a row (schema: college_name text, division text).
 * Supabase may return snake_case or camelCase depending on client.
 */
function rowCollegeName(row: Record<string, unknown>): string {
  const v = row.college_name ?? row.collegeName
  return (v != null ? String(v) : "").trim()
}
function rowDivision(row: Record<string, unknown>): string {
  const v = row.division
  return (v != null ? String(v) : "").trim()
}

/**
 * Get division for a college from college_division_mappings table.
 * Table: college_name (text), division (text). Match: exact lowercase, then longest substring.
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
    if (!error && Array.isArray(rows) && rows.length > 0) {
      for (const row of rows) {
        const name = rowCollegeName(row as Record<string, unknown>)
        const div = rowDivision(row as Record<string, unknown>)
        if (name && div) cache.set(name.toLowerCase(), div)
      }
    }
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
