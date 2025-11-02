import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all unique division values
    const { data: divisionData, error: divisionError } = await supabase
      .from("athletes")
      .select("division")
      .not("division", "is", null)

    if (divisionError) {
      return NextResponse.json({ error: divisionError.message }, { status: 500 })
    }

    // Count occurrences of each division
    const divisionCounts: Record<string, number> = {}
    divisionData.forEach((item) => {
      const division = item.division || "null"
      divisionCounts[division] = (divisionCounts[division] || 0) + 1
    })

    // Get sample athletes for each division
    const divisionSamples: Record<string, any[]> = {}
    for (const division of Object.keys(divisionCounts)) {
      const { data: samples, error: samplesError } = await supabase
        .from("athletes")
        .select("id, name, college, division")
        .eq("division", division)
        .limit(5)

      if (samplesError) {
        console.error(`Error fetching samples for division ${division}:`, samplesError)
        divisionSamples[division] = []
      } else {
        divisionSamples[division] = samples
      }
    }

    // Get all Division I athletes
    const { data: divisionIAthletes, error: divisionIError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .eq("division", "Division I")

    if (divisionIError) {
      console.error("Error fetching Division I athletes:", divisionIError)
    }

    // Get all athletes with NC State or UNC
    const { data: ncStateUncAthletes, error: ncStateUncError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .or(
        "college.ilike.%NC State%,college.ilike.%North Carolina State%,college.ilike.%UNC%,college.ilike.%North Carolina%",
      )

    if (ncStateUncError) {
      console.error("Error fetching NC State/UNC athletes:", ncStateUncError)
    }

    return NextResponse.json({
      divisionCounts,
      divisionSamples,
      divisionICount: divisionIAthletes?.length || 0,
      divisionIAthletes: divisionIAthletes || [],
      ncStateUncCount: ncStateUncAthletes?.length || 0,
      ncStateUncAthletes: ncStateUncAthletes || [],
    })
  } catch (error) {
    console.error("Error in division data route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
