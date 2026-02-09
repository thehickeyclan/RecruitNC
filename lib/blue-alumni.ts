import { createAdminClient } from "@/lib/supabase/admin"
import { getDivisionFromMappings } from "@/lib/get-division-from-mappings"

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
 * Division only from college_divisions (single source of truth).
 */
const ALUMNI_CUTOFF_YEAR = 2025

export async function getBlueAlumni(): Promise<BlueAlumnus[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, highschool, college, division, ncUnitedTeam")
      .lte("graduationyear", ALUMNI_CUTOFF_YEAR)
      .gte("graduationyear", CURRENT_YEAR - 20)
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    if (error) {
      console.error("[blue-alumni] query error:", error)
      return []
    }

    const blueValue = (row: any) => {
      const raw = row?.ncUnitedTeam ?? row?.ncunitedteam ?? row?.nc_united_team ?? ""
      return String(raw ?? "").toLowerCase().trim()
    }
    const isBlue = (row: any) => {
      const v = blueValue(row)
      return v === "blue" || v === "both" || v.includes("blue")
    }
    const blueAlumni = (data ?? []).filter(isBlue)

    const withDivision = await Promise.all(
      blueAlumni.map(async (row: any) => {
        const college = row.college ?? ""
        const division = (await getDivisionFromMappings(college)) || "Unknown"
        return {
          id: row.id ?? "",
          name: row.name ?? "",
          graduationyear: Number(row.graduationyear) || 0,
          highschool: row.highschool ?? "",
          college: row.college ?? "",
          division,
        }
      }),
    )
    return withDivision
  } catch (e) {
    console.error("[blue-alumni] error:", e)
    return []
  }
}
