import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { standardizeDivision, getCollegeDivision } from "@/lib/division-standardizer"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Get all athletes
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, division, college")
      .order("id")

    if (fetchError) {
      console.error("Error fetching athletes:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates: { id: string; oldDivision: string | null; newDivision: string }[] = []
    const errors: { id: string; error: string }[] = []

    // Process each athlete
    for (const athlete of athletes || []) {
      try {
        // Get standardized division
        let standardizedDivision = standardizeDivision(athlete.division)

        // Special case for Montreat College
        if (athlete.college && athlete.college.toLowerCase().includes("montreat")) {
          standardizedDivision = "NAIA"
        }
        // If still unknown and we have a college, try to determine from college
        else if (standardizedDivision === "Unknown" && athlete.college) {
          const collegeDivision = getCollegeDivision(athlete.college)
          if (collegeDivision !== "Unknown") {
            standardizedDivision = collegeDivision
          }
        }

        // Only update if division changed
        if (standardizedDivision !== athlete.division) {
          const { error: updateError } = await supabase
            .from("athletes")
            .update({ division: standardizedDivision })
            .eq("id", athlete.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          updates.push({
            id: athlete.id,
            oldDivision: athlete.division,
            newDivision: standardizedDivision,
          })
        }
      } catch (err) {
        console.error(`Error updating athlete ${athlete.id}:`, err)
        errors.push({
          id: athlete.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Standardized divisions for ${updates.length} athletes with ${errors.length} errors.`,
      updates,
      errors,
    })
  } catch (error) {
    console.error("Error in fix-all-divisions API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
