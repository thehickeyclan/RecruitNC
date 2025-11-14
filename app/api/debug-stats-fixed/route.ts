import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("Starting debug stats...")

    // Get all athletes with college commitments
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Error fetching athletes" }, { status: 500 })
    }

    console.log(`Found ${athletes.length} athletes with college commitments`)

    // Initialize counters
    const divisionCounts = {
      "Division I": 0,
      "Division II": 0,
      "Division III": 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    // Only override for these specific colleges
    const collegeToDiv = {
      // Only the most critical overrides
      "nc state": "Division I",
      "north carolina state": "Division I",
      "unc chapel hill": "Division I",
      "unc-chapel hill": "Division I",
      "university of north carolina at chapel hill": "Division I",
      "university of north carolina chapel hill": "Division I",
      "appalachian state": "Division I",
      "app state": "Division I",

      // UNC Pembroke is Division II
      "unc pembroke": "Division II",
      "university of north carolina at pembroke": "Division II",
    }

    // Debug arrays to track athletes by division
    const d1Athletes = []
    const d2Athletes = []
    const d3Athletes = []
    const naiaAthletes = []
    const njcaaAthletes = []
    const unknownAthletes = []

    // Process each athlete
    athletes.forEach((athlete) => {
      const name = athlete.name || "Unknown"
      const college = (athlete.college || "").toLowerCase().trim()
      const division = (athlete.division || "").trim()

      // First check if this is one of our special override colleges
      let assignedDivision = null
      let wasOverridden = false

      // Only check for specific college overrides
      for (const [collegePattern, div] of Object.entries(collegeToDiv)) {
        if (college.includes(collegePattern)) {
          assignedDivision = div
          wasOverridden = true
          break
        }
      }

      // If not a special override, use the division from the database
      if (!assignedDivision) {
        // Use the division from the database
        if (
          division === "Division I" ||
          division === "Division II" ||
          division === "Division III" ||
          division === "NAIA" ||
          division === "NJCAA"
        ) {
          assignedDivision = division
        } else {
          // If division is not in standard format, try to standardize it
          if (
            division.toLowerCase().includes("division i") ||
            division.toLowerCase().includes("d1") ||
            division.toLowerCase() === "di"
          ) {
            assignedDivision = "Division I"
          } else if (
            division.toLowerCase().includes("division ii") ||
            division.toLowerCase().includes("d2") ||
            division.toLowerCase() === "dii"
          ) {
            assignedDivision = "Division II"
          } else if (
            division.toLowerCase().includes("division iii") ||
            division.toLowerCase().includes("d3") ||
            division.toLowerCase() === "diii"
          ) {
            assignedDivision = "Division III"
          } else if (division.toLowerCase().includes("naia")) {
            assignedDivision = "NAIA"
          } else if (
            division.toLowerCase().includes("njcaa") ||
            division.toLowerCase().includes("juco") ||
            division.toLowerCase().includes("junior college")
          ) {
            assignedDivision = "NJCAA"
          } else {
            assignedDivision = "Unknown"
          }
        }
      }

      // Increment counter
      divisionCounts[assignedDivision]++

      // Add to debug arrays
      const athleteInfo = {
        id: athlete.id,
        name,
        college,
        originalDivision: division,
        assignedDivision,
        wasOverridden,
      }

      if (assignedDivision === "Division I") {
        d1Athletes.push(athleteInfo)
      } else if (assignedDivision === "Division II") {
        d2Athletes.push(athleteInfo)
      } else if (assignedDivision === "Division III") {
        d3Athletes.push(athleteInfo)
      } else if (assignedDivision === "NAIA") {
        naiaAthletes.push(athleteInfo)
      } else if (assignedDivision === "NJCAA") {
        njcaaAthletes.push(athleteInfo)
      } else {
        unknownAthletes.push(athleteInfo)
      }
    })

    // Log detailed information
    console.log("Division counts:", divisionCounts)

    return NextResponse.json({
      totalCommitments: athletes.length,
      divisionBreakdown: divisionCounts,
      d1Athletes: d1Athletes,
      d2Athletes: d2Athletes,
      d3Athletes: d3Athletes,
      naiaAthletes: naiaAthletes,
      njcaaAthletes: njcaaAthletes,
      unknownAthletes: unknownAthletes,
    })
  } catch (error) {
    console.error("Error in debug stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
