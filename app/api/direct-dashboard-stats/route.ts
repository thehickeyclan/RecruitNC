import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    // Get all athletes with college commitments
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, college, division, graduationyear")
      .not("college", "is", null)
      .or("is_prospect.is.null,is_prospect.eq.false")

    if (athletesError) {
      return NextResponse.json({ error: "Failed to get athletes" }, { status: 500 })
    }

    // Get the total count of athletes with commitments
    const totalCommitments = athletes.length

    // Initialize stats object
    const stats = {
      totalCommitments,
      classOf2025: 0,
      classOf2026: 0,
      divisionBreakdown: {
        D1: 0,
        D2: 0,
        D3: 0,
        NAIA: 0,
        NJCAA: 0,
      },
    }

    // Count athletes by graduation year
    athletes.forEach((athlete) => {
      if (athlete.graduationyear === 2025) {
        stats.classOf2025++
      } else if (athlete.graduationyear === 2026) {
        stats.classOf2026++
      }
    })

    // Count athletes by division - EXACT MATCH with debug page
    athletes.forEach((athlete) => {
      const division = athlete.division || ""

      // Use exact matching to match the debug page
      if (division === "NCAA Division I") {
        stats.divisionBreakdown.D1++
      } else if (division === "NCAA Division II") {
        stats.divisionBreakdown.D2++
      } else if (division === "NCAA Division III") {
        stats.divisionBreakdown.D3++
      } else if (division === "NAIA") {
        stats.divisionBreakdown.NAIA++
      } else if (division === "NJCAA") {
        stats.divisionBreakdown.NJCAA++
      }
    })

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        totalCommitments: 0,
        classOf2025: 0,
        classOf2026: 0,
        divisionBreakdown: {
          D1: 0,
          D2: 0,
          D3: 0,
          NAIA: 0,
          NJCAA: 0,
        },
      },
      { status: 500 },
    )
  }
}
