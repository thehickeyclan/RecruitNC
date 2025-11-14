import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division")
      .not("college", "is", null)

    if (error) {
      console.error("Error fetching athletes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count total commitments
    const totalCommitments = athletes.length

    // Count by division - use exact matches only
    const divisionCounts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    athletes.forEach((athlete) => {
      const division = athlete.division

      if (division === "Division I") {
        divisionCounts.D1++
      } else if (division === "Division II") {
        divisionCounts.D2++
      } else if (division === "Division III") {
        divisionCounts.D3++
      } else if (division === "NAIA") {
        divisionCounts.NAIA++
      } else if (division === "NJCAA") {
        divisionCounts.NJCAA++
      } else {
        divisionCounts.Unknown++
      }
    })

    return NextResponse.json({
      totalCommitments,
      divisionBreakdown: divisionCounts,
      rawData: {
        athletes: athletes.slice(0, 20), // First 20 athletes for debugging
      },
    })
  } catch (error) {
    console.error("Error in direct stats simple route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
