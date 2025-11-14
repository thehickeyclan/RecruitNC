import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { normalizeDivision } from "@/lib/athlete-utils"

export async function GET() {
  try {
    // Get all athletes with division data
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("id, division")
      .not("division", "is", null)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const updates = []

    // Process each athlete and normalize the division
    for (const athlete of athletes) {
      const normalizedDivision = await normalizeDivision(athlete.division)

      // Only update if the normalized division is different
      if (normalizedDivision !== athlete.division) {
        const { data, error: updateError } = await supabase
          .from("athletes")
          .update({ division: normalizedDivision })
          .eq("id", athlete.id)
          .select()

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          updates.push({
            id: athlete.id,
            oldDivision: athlete.division,
            newDivision: normalizedDivision,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updates.length} division entries`,
      updates,
    })
  } catch (error) {
    console.error("Error fixing divisions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
