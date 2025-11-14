import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all NC State and UNC athletes
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .or(
        "college.ilike.%NC State%,college.ilike.%North Carolina State%,college.ilike.%UNC%,college.ilike.%North Carolina%",
      )
      .not("college", "ilike", "%North Carolina Wesleyan%") // Exclude NC Wesleyan
      .not("college", "ilike", "%North Carolina A&T%") // Exclude NC A&T
      .not("college", "ilike", "%UNC Pembroke%") // Exclude UNC Pembroke

    if (error) {
      console.error("Error fetching NC State/UNC athletes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const updates = []
    let updateCount = 0

    // Update each athlete to Division I
    for (const athlete of athletes) {
      if (athlete.division !== "Division I") {
        const { error: updateError } = await supabase
          .from("athletes")
          .update({ division: "Division I" })
          .eq("id", athlete.id)

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          updateCount++
          updates.push({
            id: athlete.id,
            name: athlete.name,
            college: athlete.college,
            oldDivision: athlete.division,
            newDivision: "Division I",
          })
        }
      }
    }

    return NextResponse.json({
      message: "NC State/UNC athletes updated",
      totalAthletes: athletes.length,
      updatedAthletes: updateCount,
      updates,
    })
  } catch (error) {
    console.error("Error in fix NC State/UNC route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
