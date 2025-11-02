import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getCollegeDivision } from "@/lib/college-utils-v2"

export async function POST() {
  try {
    // Fetch all athletes with college commitments
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (fetchError) {
      console.error("Error fetching athletes:", fetchError)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch athletes from database",
          updated: 0,
        },
        { status: 500 },
      )
    }

    // Track changes for reporting
    const changes: { college: string; oldDivision: string; newDivision: string }[] = []
    let updatedCount = 0

    // Process each athlete and update if needed
    for (const athlete of athletes) {
      if (!athlete.college) continue

      // Get the correct division based on college name
      const correctDivision = getCollegeDivision(athlete.college)

      // Skip if division is already correct
      if (athlete.division === correctDivision) continue

      // Update the athlete's division
      const { error: updateError } = await supabase
        .from("athletes")
        .update({ division: correctDivision })
        .eq("id", athlete.id)

      if (updateError) {
        console.error(`Error updating athlete ${athlete.id}:`, updateError)
        continue
      }

      // Track this change
      changes.push({
        college: athlete.college,
        oldDivision: athlete.division || "Unknown",
        newDivision: correctDivision,
      })

      updatedCount++
    }

    // Group changes by college for cleaner reporting
    const uniqueChanges = changes.reduce(
      (acc, change) => {
        const key = `${change.college}|${change.oldDivision}|${change.newDivision}`
        if (!acc[key]) {
          acc[key] = change
        }
        return acc
      },
      {} as Record<string, (typeof changes)[0]>,
    )

    return NextResponse.json({
      success: true,
      message: "Successfully updated athlete division values",
      updated: updatedCount,
      details: Object.values(uniqueChanges),
    })
  } catch (error) {
    console.error("Error in fix-all-divisions-v3:", error)
    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred",
        updated: 0,
      },
      { status: 500 },
    )
  }
}
