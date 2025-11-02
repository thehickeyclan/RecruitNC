import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// List of known NJCAA schools
const njcaaSchools = [
  "rowan cabarrus",
  "rowan-cabarrus",
  "rowan cabarrus community college",
  "rowan-cabarrus community college",
  "rccc",
  "central carolina",
  "central carolina community college",
  "cccc",
  "wake tech",
  "wake technical",
  "wake technical community college",
  "wake tech community college",
  "spartanburg methodist",
  "spartanburg methodist college",
  "smc",
]

export async function GET() {
  try {
    // First, check if we have any athletes with NJCAA division
    const { data: njcaaAthletes, error: njcaaError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .ilike("division", "%njcaa%")
      .or("division.ilike.%juco%,division.ilike.%junior college%")

    if (njcaaError) {
      return NextResponse.json({ error: njcaaError.message }, { status: 500 })
    }

    // If we already have NJCAA athletes, return them
    if (njcaaAthletes && njcaaAthletes.length > 0) {
      return NextResponse.json({
        message: `Found ${njcaaAthletes.length} existing NJCAA athletes`,
        athletes: njcaaAthletes,
        action: "none",
      })
    }

    // Check for athletes with known NJCAA schools
    let foundAthlete = false
    let updatedAthlete = null

    for (const school of njcaaSchools) {
      const { data: schoolAthletes, error: schoolError } = await supabase
        .from("athletes")
        .select("id, name, college, division")
        .ilike("college", `%${school}%`)
        .limit(1)

      if (schoolError) {
        console.error(`Error checking for ${school}:`, schoolError)
        continue
      }

      if (schoolAthletes && schoolAthletes.length > 0) {
        foundAthlete = true

        // Update the athlete's division to NJCAA
        const { data: updated, error: updateError } = await supabase
          .from("athletes")
          .update({ division: "NJCAA" })
          .eq("id", schoolAthletes[0].id)
          .select()

        if (updateError) {
          return NextResponse.json(
            {
              error: `Failed to update athlete: ${updateError.message}`,
            },
            { status: 500 },
          )
        }

        updatedAthlete = updated?.[0] || schoolAthletes[0]
        break
      }
    }

    // If we found and updated an athlete
    if (foundAthlete && updatedAthlete) {
      return NextResponse.json({
        success: true,
        message: "Updated athlete division to NJCAA",
        athlete: updatedAthlete,
        action: "updated",
      })
    }

    // If we didn't find any NJCAA athletes, create a dummy one for testing
    // This is just for development and should be removed in production
    return NextResponse.json({
      message: "No NJCAA athletes found. Please add one manually.",
      action: "none",
    })
  } catch (error) {
    console.error("Error fixing NJCAA athlete:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
