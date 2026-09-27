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

/**
 * The newest class that counts as alumni, derived rather than typed.
 *
 * This was `2025`, hardcoded. The Class of 2026 graduated in the spring and by September were
 * wrestling in college, and the Blue alumni list still did not know they existed — the same
 * shape of bug as every other date written as a constant: correct the year it was written and
 * quietly wrong from the following summer.
 *
 * A class graduates in the spring of its graduation year, so from July onwards that year's
 * wrestlers are alumni. Before July the current seniors are still in school and the cutoff is
 * the year before.
 */
export function alumniCutoffYear(now: Date = new Date()): number {
  const year = now.getFullYear()
  // getMonth() is zero-based: 6 is July.
  return now.getMonth() >= 6 ? year : year - 1
}

export async function getBlueAlumni(): Promise<BlueAlumnus[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, highschool, college, college_id, ncUnitedTeam")
      .lte("graduationyear", alumniCutoffYear())
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
