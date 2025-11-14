import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Known college divisions mapping
const knownCollegeDivisions: Record<string, string> = {
  // DI Schools
  "nc state": "Division I",
  "north carolina state": "Division I",
  "north carolina state university": "Division I",
  unc: "Division I",
  "unc chapel hill": "Division I",
  "north carolina": "Division I",
  "university of north carolina": "Division I",
  "university of north carolina at chapel hill": "Division I",
  "appalachian state": "Division I",
  "app state": "Division I",
  campbell: "Division I",
  "campbell university": "Division I",
  davidson: "Division I",
  "davidson college": "Division I",
  duke: "Division I",
  "duke university": "Division I",
  elon: "Division I",
  "elon university": "Division I",
  "gardner-webb": "Division I",
  "gardner webb": "Division I",
  "high point": "Division I",
  "high point university": "Division I",

  // DII Schools
  "belmont abbey": "Division II",
  "belmont abbey college": "Division II",
  "unc pembroke": "Division II",
  pembroke: "Division II",
  queens: "Division II",
  "queens university": "Division II",
  limestone: "Division II",
  "limestone university": "Division II",
  coker: "Division II",
  "coker university": "Division II",
  newberry: "Division II",
  "newberry college": "Division II",
  "mars hill": "Division II",
  "mars hill university": "Division II",
  king: "Division II",
  "king university": "Division II",
  barton: "Division II",
  "barton college": "Division II",
  emmanuel: "Division II",
  "emmanuel college": "Division II",
  "lees-mcrae": "Division II",
  "lees mcrae": "Division II",
  "lenoir-rhyne": "Division II",
  "lenoir rhyne": "Division II",
  wingate: "Division II",
  "wingate university": "Division II",

  // DIII Schools
  roanoke: "Division III",
  "roanoke college": "Division III",
  ferrum: "Division III",
  "ferrum college": "Division III",
  greensboro: "Division III",
  marymount: "Division III",
  "greensboro college": "Division III",
  guilford: "Division III",
  "guilford college": "Division III",
  methodist: "Division III",
  "methodist university": "Division III",
  "nc wesleyan": "Division III",
  "north carolina wesleyan": "Division III",
  averett: "Division III",
  "averett university": "Division III",
  "washington and lee": "Division III",
  "washington & lee": "Division III",
  "hampden-sydney": "Division III",
  "hampden sydney": "Division III",
  "randolph-macon": "Division III",
  bridgewater: "Division III",
  "bridgewater college": "Division III",
  shenandoah: "Division III",
  "shenandoah university": "Division III",
  marymount: "Division III", // This line is already added in the updates

  // NAIA Schools
  montreat: "NAIA",
  "montreat college": "NAIA",
  "st andrews": "NAIA",
  "st. andrews": "NAIA",
  "saint andrews": "NAIA",
  "st andrews university": "NAIA",
  "st. andrews university": "NAIA",
  "saint andrews university": "NAIA",
  "truett mcconnell": "NAIA",
  "truett-mcconnell": "NAIA",
  "truett mcconnell university": "NAIA",
  "truett-mcconnell university": "NAIA",

  // NJCAA Schools
  "surry community college": "NJCAA",
  "surry cc": "NJCAA",
  surry: "NJCAA",
  "caldwell community college": "NJCAA",
  "caldwell cc": "NJCAA",
  caldwell: "NJCAA",
  "rowan cabarrus community college": "NJCAA",
  "rowan cabarrus cc": "NJCAA",
  "rowan cabarrus": "NJCAA",
}

// Function to standardize division names
function standardizeDivision(division: string | null, college: string | null): string {
  if (!division && !college) return "Unknown"

  // If we have a college, check if it's in our known mappings
  if (college) {
    const collegeLower = college.toLowerCase().trim()
    for (const [key, value] of Object.entries(knownCollegeDivisions)) {
      if (collegeLower.includes(key)) {
        return value
      }
    }
  }

  // If we don't have a division, return Unknown
  if (!division) return "Unknown"

  // Standardize division names
  const divLower = division.toLowerCase().trim()

  if (
    divLower === "division i" ||
    divLower === "division 1" ||
    divLower === "d1" ||
    divLower === "di" ||
    divLower === "ncaa division i" ||
    divLower === "ncaa d1" ||
    divLower === "ncaa di"
  ) {
    return "Division I"
  }

  if (
    divLower === "division ii" ||
    divLower === "division 2" ||
    divLower === "d2" ||
    divLower === "dii" ||
    divLower === "ncaa division ii" ||
    divLower === "ncaa d2" ||
    divLower === "ncaa dii"
  ) {
    return "Division II"
  }

  if (
    divLower === "division iii" ||
    divLower === "division 3" ||
    divLower === "d3" ||
    divLower === "diii" ||
    divLower === "ncaa division iii" ||
    divLower === "ncaa d3" ||
    divLower === "ncaa diii"
  ) {
    return "Division III"
  }

  if (divLower === "naia" || divLower.includes("naia")) {
    return "NAIA"
  }

  if (
    divLower === "njcaa" ||
    divLower === "juco" ||
    divLower === "junior college" ||
    divLower.includes("community college") ||
    divLower.includes("jc")
  ) {
    return "NJCAA"
  }

  // If we can't standardize, return the original
  return division
}

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, college, division")
      .not("college", "is", null)

    if (error) {
      console.error("Error fetching athletes:", error)
      return NextResponse.json({ error: "Error fetching athletes" }, { status: 500 })
    }

    const updates = []
    const results = {
      total: athletes.length,
      updated: 0,
      unchanged: 0,
      byDivision: {
        "Division I": 0,
        "Division II": 0,
        "Division III": 0,
        NAIA: 0,
        NJCAA: 0,
        Unknown: 0,
      },
    }

    // Process each athlete
    for (const athlete of athletes) {
      const standardizedDivision = standardizeDivision(athlete.division, athlete.college)

      // Count by division
      if (results.byDivision[standardizedDivision] !== undefined) {
        results.byDivision[standardizedDivision]++
      } else {
        results.byDivision["Unknown"]++
      }

      // If division needs to be updated
      if (standardizedDivision !== athlete.division) {
        const { error: updateError } = await supabase
          .from("athletes")
          .update({ division: standardizedDivision })
          .eq("id", athlete.id)

        if (updateError) {
          console.error(`Error updating athlete ${athlete.id}:`, updateError)
        } else {
          results.updated++
          updates.push({
            id: athlete.id,
            college: athlete.college,
            oldDivision: athlete.division,
            newDivision: standardizedDivision,
          })
        }
      } else {
        results.unchanged++
      }
    }

    return NextResponse.json({
      message: "Division standardization complete",
      results,
      updates: updates.slice(0, 50), // Limit to first 50 updates for response size
    })
  } catch (error) {
    console.error("Error standardizing divisions:", error)
    return NextResponse.json({ error: "Error standardizing divisions" }, { status: 500 })
  }
}
