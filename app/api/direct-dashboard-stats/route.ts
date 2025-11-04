import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get athletes with commitments based on recruiting_status
    // "Committed" or "Signed" = current commitments
    // "College Athlete" = already in college (past graduation years)
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, college, division, graduationyear, recruiting_status")
      .not("college", "is", null)
      .neq("college", "")
      .in("recruiting_status", ["Committed", "Signed", "College Athlete", "committed", "signed"])

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to get athletes" }, { status: 500 })
    }

    if (!athletes) {
      return NextResponse.json({
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
      })
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

    // Count athletes by graduation year (handle both string and number)
    athletes.forEach((athlete) => {
      const gradYear = athlete.graduationyear
      // Convert to number for comparison
      const yearNum = typeof gradYear === 'string' ? parseInt(gradYear) : gradYear
      
      if (yearNum === 2025) {
        stats.classOf2025++
      } else if (yearNum === 2026) {
        stats.classOf2026++
      }
    })

    // Count athletes by division - flexible matching
    athletes.forEach((athlete) => {
      const division = (athlete.division || "").trim().toLowerCase()

      // Match various division formats
      if (
        division === "ncaa division i" ||
        division === "division i" ||
        division === "division 1" ||
        division === "d1" ||
        division === "di" ||
        division === "div i" ||
        division === "div 1"
      ) {
        stats.divisionBreakdown.D1++
      } else if (
        division === "ncaa division ii" ||
        division === "division ii" ||
        division === "division 2" ||
        division === "d2" ||
        division === "dii" ||
        division === "div ii" ||
        division === "div 2"
      ) {
        stats.divisionBreakdown.D2++
      } else if (
        division === "ncaa division iii" ||
        division === "division iii" ||
        division === "division 3" ||
        division === "d3" ||
        division === "diii" ||
        division === "div iii" ||
        division === "div 3"
      ) {
        stats.divisionBreakdown.D3++
      } else if (division === "naia") {
        stats.divisionBreakdown.NAIA++
      } else if (
        division === "njcaa" ||
        division === "juco" ||
        division === "junior college" ||
        division === "community college"
      ) {
        stats.divisionBreakdown.NJCAA++
      }
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error in direct-dashboard-stats:", error)
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
