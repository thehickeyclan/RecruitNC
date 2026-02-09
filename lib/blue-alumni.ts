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
 * Server-only: fetch Blue alumni (ncUnitedTeam = blue, graduation year < current year).
 * Ordered by graduation year desc, then name.
 */
export async function getBlueAlumni(): Promise<BlueAlumnus[]> {
  try {
    const supabase = createAdminClient()
    // ncUnitedTeam / ncunitedteam: value "blue" or "both" = Blue program. Filter in JS for column name flexibility.
    const { data, error } = await supabase
      .from("athletes")
      .select("id, name, graduationyear, highschool, college, division, ncunitedteam, ncUnitedTeam")
      .lt("graduationyear", CURRENT_YEAR)
      .gte("graduationyear", CURRENT_YEAR - 20)
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    const blueValue = (row: any) =>
      (row?.ncunitedteam ?? row?.ncUnitedTeam ?? "").toString().toLowerCase()
    const isBlue = (row: any) => {
      const v = blueValue(row)
      return v === "blue" || v === "both"
    }
    const blueAlumni = (data ?? []).filter(isBlue)

    if (error) {
      console.error("[blue-alumni] query error:", error)
      return []
    }

    return blueAlumni.map((row: any) => ({
      id: row.id ?? "",
      name: row.name ?? "",
      graduationyear: Number(row.graduationyear) || 0,
      highschool: row.highschool ?? "",
      college: row.college ?? "",
      division: row.division ?? "",
    }))
  } catch (e) {
    console.error("[blue-alumni] error:", e)
    return []
  }
}
