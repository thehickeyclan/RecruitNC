import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group athletes by division
    const athletesByDivision: Record<string, any[]> = {}

    athletes.forEach((athlete) => {
      const division = athlete.division || "No Division"

      if (!athletesByDivision[division]) {
        athletesByDivision[division] = []
      }

      athletesByDivision[division].push({
        id: athlete.id,
        name: athlete.name,
        college: athlete.college,
      })
    })

    // Count athletes by division
    const divisionCounts: Record<string, number> = {}

    Object.keys(athletesByDivision).forEach((division) => {
      divisionCounts[division] = athletesByDivision[division].length
    })

    return NextResponse.json({
      totalAthletes: athletes.length,
      divisionCounts,
      athletesByDivision,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
