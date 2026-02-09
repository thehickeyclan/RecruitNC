import { createAdminClient } from "@/lib/supabase/admin"

const CURRENT_YEAR = new Date().getFullYear()

export type BlueAlumnus = {
  id: string
  name: string
  graduationyear: number
  highschool: string
  college: string
  division: string
}

/**
 * Server-only: fetch Blue alumni (ncUnitedTeam = blue, graduation year 2025 and older).
 * Division only from college_division_mappings (single source of truth). Never use athlete.division.
 * Reads mappings in the same request so no shared cache can serve wrong data.
 */
const ALUMNI_CUTOFF_YEAR = 2025

/** Build map: lowercase college_name -> division. Used for longest-match lookup. */
function buildDivisionMap(
  rows: { college_name?: string; collegeName?: string; division?: string }[]
): Map<string, string> {
  const map = new Map<string, string>()
  for (const r of rows) {
    const name = (r.college_name ?? r.collegeName ?? "").toString().trim()
    const div = (r.division ?? "").toString().trim()
    if (name && div) map.set(name.toLowerCase(), div)
  }
  return map
}

/** Longest-match lookup so "Roanoke College" wins over "Roanoke", "Belmont Abbey" over "Abbey". */
function lookupDivision(map: Map<string, string>, collegeName: string): string {
  const raw = (collegeName ?? "").trim()
  if (!raw || !map.size) return ""
  const key = raw.toLowerCase()
  const exact = map.get(key)
  if (exact) return exact
  let bestKey = ""
  let bestDivision = ""
  for (const [dbKey, div] of map) {
    if (!(key.includes(dbKey) || dbKey.includes(key))) continue
    if (dbKey.length > bestKey.length) {
      bestKey = dbKey
      bestDivision = div
    }
  }
  return bestDivision
}

export async function getBlueAlumni(): Promise<BlueAlumnus[]> {
  try {
    const supabase = createAdminClient()

    const [athletesRes, mappingsRes] = await Promise.all([
      supabase
        .from("athletes")
        .select("id, name, graduationyear, highschool, college, division, ncUnitedTeam")
        .lte("graduationyear", ALUMNI_CUTOFF_YEAR)
        .gte("graduationyear", CURRENT_YEAR - 20)
        .order("graduationyear", { ascending: false })
        .order("name", { ascending: true }),
      supabase.from("college_division_mappings").select("college_name, division"),
    ])

    if (athletesRes.error) {
      console.error("[blue-alumni] query error:", athletesRes.error)
      return []
    }

    const divisionMap = buildDivisionMap(mappingsRes.data ?? [])

    const blueValue = (row: any) => {
      const raw = row?.ncUnitedTeam ?? row?.ncunitedteam ?? row?.nc_united_team ?? ""
      return String(raw ?? "").toLowerCase().trim()
    }
    const isBlue = (row: any) => {
      const v = blueValue(row)
      return v === "blue" || v === "both" || v.includes("blue")
    }
    const blueAlumni = (athletesRes.data ?? []).filter(isBlue)

    return blueAlumni.map((row: any) => {
      const college = row.college ?? ""
      const division = lookupDivision(divisionMap, college) || "Unknown"
      return {
        id: row.id ?? "",
        name: row.name ?? "",
        graduationyear: Number(row.graduationyear) || 0,
        highschool: row.highschool ?? "",
        college: row.college ?? "",
        division,
      }
    })
  } catch (e) {
    console.error("[blue-alumni] error:", e)
    return []
  }
}
