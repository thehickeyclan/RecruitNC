import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Check for NC State athletes
    const { data: ncStateAthletes, error: ncStateError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .or("college.ilike.%nc state%,college.ilike.%north carolina state%")

    if (ncStateError) {
      return NextResponse.json({ error: "Error fetching NC State athletes" }, { status: 500 })
    }

    // Check for UNC athletes
    const { data: uncAthletes, error: uncError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .or("college.ilike.%unc%,college.ilike.%north carolina%")
      .not("college", "ilike", "%wilmington%")
      .not("college", "ilike", "%pembroke%")
      .not("college", "ilike", "%charlotte%")
      .not("college", "ilike", "%greensboro%")
      .not("college", "ilike", "%asheville%")

    if (uncError) {
      return NextResponse.json({ error: "Error fetching UNC athletes" }, { status: 500 })
    }

    // Fix NC State athletes
    const ncStateUpdates = []
    for (const athlete of ncStateAthletes) {
      if (athlete.division !== "Division I") {
        const { data, error } = await supabase
          .from("athletes")
          .update({ division: "Division I" })
          .eq("id", athlete.id)
          .select()

        if (error) {
          console.error(`Error updating NC State athlete ${athlete.id}:`, error)
        } else {
          ncStateUpdates.push({
            id: athlete.id,
            name: athlete.name,
            oldDivision: athlete.division,
            newDivision: "Division I",
          })
        }
      }
    }

    // Fix UNC athletes
    const uncUpdates = []
    for (const athlete of uncAthletes) {
      if (athlete.division !== "Division I") {
        const { data, error } = await supabase
          .from("athletes")
          .update({ division: "Division I" })
          .eq("id", athlete.id)
          .select()

        if (error) {
          console.error(`Error updating UNC athlete ${athlete.id}:`, error)
        } else {
          uncUpdates.push({
            id: athlete.id,
            name: athlete.name,
            oldDivision: athlete.division,
            newDivision: "Division I",
          })
        }
      }
    }

    return NextResponse.json({
      ncStateAthletes,
      uncAthletes,
      ncStateUpdates,
      uncUpdates,
      message: "Check and fix completed",
    })
  } catch (error) {
    console.error("Error in check-unc-ncstate:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
