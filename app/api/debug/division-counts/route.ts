import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, college, division")
      .not("college", "is", null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Count by division
    const divisionCounts: Record<string, number> = {}
    const athletesByDivision: Record<string, any[]> = {}

    athletes.forEach((athlete) => {
      const division = athlete.division || "Unknown"

      if (!divisionCounts[division]) {
        divisionCounts[division] = 0
        athletesByDivision[division] = []
      }

      divisionCounts[division]++
      athletesByDivision[division].push({
        id: athlete.id,
        college: athlete.college,
        division: athlete.division,
      })
    })

    return NextResponse.json({
      totalAthletes: athletes.length,
      divisionCounts,
      athletesByDivision,
    })
  } catch (error) {
    console.error("Error getting division counts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
