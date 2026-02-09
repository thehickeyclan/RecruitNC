import { createAdminClient } from "@/lib/supabase/admin"
import { getCollegesByIds } from "@/lib/colleges"

const CURRENT_YEAR = new Date().getFullYear()

export type BlueAlumnus = {
  id: string
  name: string
  graduationyear: number
  highschool: string
  college: string
  college_logo_url?: string | null
  division: string
}

const ALUMNI_CUTOFF_YEAR = 2025

export async function getBlueAlumni(): Promise<BlueAlumnus[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, highschool, college, college_id, ncUnitedTeam")
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

    const collegeIds = [...new Set(blueAlumni.map((r: any) => r.college_id).filter(Boolean))]
    const collegesMap = collegeIds.length > 0 ? await getCollegesByIds(supabase, collegeIds) : new Map()

    return blueAlumni.map((row: any) => {
      const collegeRow = row.college_id ? collegesMap.get(row.college_id) : null
      const collegeName = collegeRow?.name || row.college || ""
      const division = collegeRow?.division ?? ""
      const college_logo_url = collegeRow?.logo_url ?? null
      return {
        id: row.id ?? "",
        name: row.name ?? "",
        graduationyear: Number(row.graduationyear) || 0,
        highschool: row.highschool ?? "",
        college: collegeName,
        college_logo_url,
        division,
      }
    })
  } catch (e) {
    console.error("[blue-alumni] error:", e)
    return []
  }
}
