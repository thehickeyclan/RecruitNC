// School division lookup utility
export async function getSchoolDivision(schoolName: string): Promise<string | null> {
  if (!schoolName) return null

  try {
    const { createServerClient } = await import("@supabase/ssr")
    const { cookies } = await import("next/headers")

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value
          },
        },
      },
    )

    // Try exact match first
    let { data } = await supabase
      .from("nc_school_divisions")
      .select("division")
      .ilike("school_name", schoolName)
      .single()

    if (data) return data.division

    // Try fuzzy matching for common variations
    const cleanSchoolName = schoolName.replace(/\s+(high\s+school|hs|academy|charter|prep|school)$/i, "").trim()
    ;({ data } = await supabase
      .from("nc_school_divisions")
      .select("division")
      .ilike("school_name", `%${cleanSchoolName}%`)
      .single())

    return data?.division || null
  } catch (error) {
    console.error("Error looking up school division:", error)
    return null
  }
}

export async function updateAthleteDivisionFromSchool(athleteId: string, schoolName: string) {
  const division = await getSchoolDivision(schoolName)

  if (division) {
    const { createServerClient } = await import("@supabase/ssr")
    const { cookies } = await import("next/headers")

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value
          },
        },
      },
    )

    // Update the highSchoolLogoUrl field to store division
    await supabase.from("athletes").update({ highSchoolLogoUrl: division }).eq("id", athleteId)
  }
}
