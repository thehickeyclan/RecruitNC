import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCollegeDivision, standardizeDivision } from "@/lib/college-utils-v2"

export async function GET() {
  try {
    // Get all athletes
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let updated = 0
    const updates = []
    const divisionCounts: Record<string, number> = {
      "Division I": 0,
      "Division II": 0,
      "Division III": 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    // Process each athlete
    for (const athlete of athletes) {
      // Get the expected division based on college
      const expectedDivision = getCollegeDivision(athlete.college)

      // Standardize the current division
      const currentDivision = standardizeDivision(athlete.division)

      // Update division counts
      divisionCounts[expectedDivision] = (divisionCounts[expectedDivision] || 0) + 1

      // If the divisions don't match, update the athlete
      if (currentDivision !== expectedDivision) {
        const { error: updateError } = await supabase
          .from("athletes")
          .update({ division: expectedDivision })
          .eq("id", athlete.id)

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          updated++
          updates.push({
            id: athlete.id,
            name: athlete.name,
            college: athlete.college,
            oldDivision: currentDivision,
            newDivision: expectedDivision,
          })
        }
      }
    }

    return NextResponse.json({
      message: `Successfully updated ${updated} athletes`,
      totalAthletes: athletes.length,
      updatedAthletes: updated,
      divisionCounts,
      updates: updates.slice(0, 100), // Limit to first 100 updates
    })
  } catch (error) {
    console.error("Error in update-divisions-by-college route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
