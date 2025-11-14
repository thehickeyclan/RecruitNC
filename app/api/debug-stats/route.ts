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

    // Division mapping for specific colleges
    const collegeToDiv = {
      // D1 Schools
      "nc state": "Division I",
      "north carolina state": "Division I",
      "unc chapel hill": "Division I",
      "unc-chapel hill": "Division I",
      "university of north carolina at chapel hill": "Division I",
      "university of north carolina chapel hill": "Division I",
      "appalachian state": "Division I",
      "app state": "Division I",

      // D2 Schools
      "unc pembroke": "Division II",
      "university of north carolina at pembroke": "Division II",
      "queens university": "Division II",
      queens: "Division II",
      wingate: "Division II",
      "wingate university": "Division II",

      // D3 Schools
      "greensboro college": "Division III",
      greensboro: "Division III",
      guilford: "Division III",
      "guilford college": "Division III",

      // NAIA Schools
      montreat: "NAIA",
      "montreat college": "NAIA",
      "belmont abbey": "NAIA",
      "belmont abbey college": "NAIA",

      // NJCAA Schools
      "surry community college": "NJCAA",
      surry: "NJCAA",
      "surry cc": "NJCAA",
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

      // First try to match by college name
      let assignedDivision = null

      // Check for specific college matches
      for (const [collegePattern, div] of Object.entries(collegeToDiv)) {
        if (college.includes(collegePattern)) {
          assignedDivision = div
          break
        }
      }

      // If no match by college, use the division field
      if (!assignedDivision) {
        // Standardize division format
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

      // Increment counter
      divisionCounts[assignedDivision]++

      // Add to debug arrays
      const athleteInfo = { id: athlete.id, name, college, originalDivision: division, assignedDivision }

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
    console.log("D1 Athletes:", d1Athletes)
    console.log("D2 Athletes:", d2Athletes)
    console.log("D3 Athletes:", d3Athletes)
    console.log("NAIA Athletes:", naiaAthletes)
    console.log("NJCAA Athletes:", njcaaAthletes)
    console.log("Unknown Athletes:", unknownAthletes)

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
