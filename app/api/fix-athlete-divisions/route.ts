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

    const updates = []

    // Known Division III schools
    const knownD3Schools = [
      "roanoke",
      "roanoke college",
      "ferrum",
      "ferrum college",
      "greensboro",
      "greensboro college",
      "guilford",
      "guilford college",
      "methodist",
      "methodist university",
      "nc wesleyan",
      "north carolina wesleyan",
      "averett",
      "averett university",
      "washington and lee",
      "washington & lee",
      "hampden-sydney",
      "hampden sydney",
      "randolph-macon",
      "randolph macon",
      "bridgewater",
      "bridgewater college",
      "shenandoah",
      "shenandoah university",
    ]

    // Known Division II schools
    const knownD2Schools = [
      "belmont abbey",
      "belmont abbey college",
      "unc pembroke",
      "pembroke",
      "queens",
      "queens university",
      "limestone",
      "limestone university",
      "coker",
      "coker university",
      "newberry",
      "newberry college",
      "mars hill",
      "mars hill university",
      "king",
      "king university",
      "barton",
      "barton college",
      "emmanuel",
      "emmanuel college",
      "lees-mcrae",
      "lees mcrae",
      "lenoir-rhyne",
      "lenoir rhyne",
      "wingate",
      "wingate university",
    ]

    // Known Division I schools
    const knownD1Schools = [
      "nc state",
      "north carolina state",
      "unc",
      "unc chapel hill",
      "north carolina",
      "university of north carolina",
      "appalachian state",
      "app state",
      "campbell",
      "campbell university",
      "davidson",
      "davidson college",
      "duke",
      "duke university",
      "elon",
      "elon university",
      "gardner-webb",
      "gardner webb",
      "high point",
      "high point university",
    ]

    // Process each athlete and normalize the division
    for (const athlete of athletes) {
      let newDivision = null
      const college = (athlete.college || "").toLowerCase().trim()
      const currentDivision = (athlete.division || "").toLowerCase().trim()

      // Check if it's a known D3 school
      if (knownD3Schools.some((school) => college.includes(school))) {
        newDivision = "NCAA D3"
      }
      // Check if it's a known D2 school
      else if (knownD2Schools.some((school) => college.includes(school))) {
        newDivision = "NCAA D2"
      }
      // Check if it's a known D1 school
      else if (knownD1Schools.some((school) => college.includes(school))) {
        newDivision = "NCAA D1"
      }
      // Check division based on text
      else if (
        currentDivision.includes("d1") ||
        currentDivision.includes("division 1") ||
        currentDivision.includes("division i")
      ) {
        newDivision = "NCAA D1"
      } else if (
        currentDivision.includes("d2") ||
        currentDivision.includes("division 2") ||
        currentDivision.includes("division ii")
      ) {
        newDivision = "NCAA D2"
      } else if (
        currentDivision.includes("d3") ||
        currentDivision.includes("division 3") ||
        currentDivision.includes("division iii") ||
        currentDivision.includes("diii")
      ) {
        newDivision = "NCAA D3"
      } else if (currentDivision.includes("naia")) {
        newDivision = "NAIA"
      } else if (
        currentDivision.includes("juco") ||
        currentDivision.includes("junior college") ||
        currentDivision.includes("jc") ||
        currentDivision.includes("community college") ||
        college.includes("community") ||
        college.includes("technical")
      ) {
        newDivision = "JUCO"
      }

      // Only update if we have a new division and it's different from the current one
      if (newDivision && newDivision.toLowerCase() !== currentDivision) {
        const { data, error: updateError } = await supabase
          .from("athletes")
          .update({ division: newDivision })
          .eq("id", athlete.id)
          .select()

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          updates.push({
            id: athlete.id,
            college: athlete.college,
            oldDivision: athlete.division || "(none)",
            newDivision,
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
    console.error("Error fixing athlete divisions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
