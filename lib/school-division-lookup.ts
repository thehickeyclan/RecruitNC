// School classification lookup (NCHSAA 1A–8A). Uses school_classifications table.
import { findSchoolClassification } from "@/lib/classification-data"
import { createClient } from "@/lib/supabase/server"

/**
 * Look up a school's NCHSAA classification (1A–8A, 1A/2A) from school_classifications table.
 */
export async function getSchoolDivision(schoolName: string): Promise<string | null> {
  if (!schoolName) return null
  try {
    const supabase = await createClient()
    return await findSchoolClassification(supabase, schoolName)
  } catch (error) {
    console.error("Error looking up school classification:", error)
    return null
  }
}

export async function updateAthleteDivisionFromSchool(athleteId: string, schoolName: string) {
  const classification = await getSchoolDivision(schoolName)
  if (!classification) return
  try {
    const supabase = await createClient()
    await supabase.from("athletes").update({ high_school_division: classification }).eq("id", athleteId)
  } catch (error) {
    console.error("Error updating athlete classification:", error)
  }
}
