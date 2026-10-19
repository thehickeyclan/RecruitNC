import "server-only"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { getDirectCollegeLogoUrl } from "@/lib/entity-logo-resolve"
import { normalizeEntityName, normalizeEntityType } from "@/lib/logo-mappings-normalize"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Every map school's logo at once, for the list under the college map (Matt, 19 Oct 2026). The
 * same rule as schoolLogoUrl (logo.ts) - an exact logo_mappings name, then the curated table,
 * never the fuzzy tier - but the table is read once instead of a query per school per name.
 */
const SCHOOLS: CollegeMapSchool[] = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]
const HOUR = 3_600_000
let cached: { at: number; logos: Record<string, string> } | null = null

const key = (name: string) => normalizeEntityName(name).toLowerCase()

export async function allSchoolLogos(): Promise<Record<string, string>> {
  if (cached && Date.now() - cached.at < HOUR) return cached.logos
  const { data: rows, error } = await createAdminClient().from("logo_mappings").select("entity_name, logo_url").eq("entity_type", normalizeEntityType("college"))
  if (error) throw new Error(`college logos: ${error.message}`)
  const exact = new Map<string, string>()
  for (const r of rows ?? []) if (r.entity_name && r.logo_url) exact.set(key(String(r.entity_name)), String(r.logo_url))

  const logos: Record<string, string> = {}
  for (const school of SCHOOLS) {
    // As logo.ts: the name, the name without its bracket, then the bracket itself.
    const bracket = school.name.match(/\(([^)]+)\)/)?.[1]
    const names = [...new Set([school.name, school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(), ...(bracket ? bracket.split(/\s+or\s+/) : [])])]
    for (const name of names) {
      const url = exact.get(key(name.trim())) ?? getDirectCollegeLogoUrl(name.trim())
      if (url) {
        logos[school.id] = url
        break
      }
    }
  }
  cached = { at: Date.now(), logos }
  return logos
}
