import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    // Fetch all athletes with college commitments
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("id, name, college, division, graduationyear")
      .not("college", "is", null)

    if (error) {
      console.error("Error fetching athletes:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    // Count athletes by division
    const divisionCounts = {
      D1: 0,
      D2: 0,
      D3: 0,
      NAIA: 0,
      NJCAA: 0,
      Unknown: 0,
    }

    // Track athletes by division
    const athletesByDivision = {
      D1: [] as any[],
      D2: [] as any[],
      D3: [] as any[],
      NAIA: [] as any[],
      NJCAA: [] as any[],
      Unknown: [] as any[],
    }

    // Process each athlete
    athletes.forEach((athlete) => {
      const division = (athlete.division || "").toLowerCase().trim()

      if (division.includes("d1") || division.includes("division i") || division.includes("division 1")) {
        divisionCounts.D1++
        athletesByDivision.D1.push(athlete)
      } else if (division.includes("d2") || division.includes("division ii") || division.includes("division 2")) {
        divisionCounts.D2++
        athletesByDivision.D2.push(athlete)
      } else if (division.includes("d3") || division.includes("division iii") || division.includes("division 3")) {
        divisionCounts.D3++
        athletesByDivision.D3.push(athlete)
      } else if (division.includes("naia")) {
        divisionCounts.NAIA++
        athletesByDivision.NAIA.push(athlete)
      } else if (
        division.includes("juco") ||
        division.includes("junior") ||
        division.includes("njcaa") ||
        division.includes("community college") ||
        division.includes("community") ||
        division.includes("jc")
      ) {
        divisionCounts.NJCAA++
        athletesByDivision.NJCAA.push(athlete)
      } else {
        divisionCounts.Unknown++
        athletesByDivision.Unknown.push(athlete)
      }
    })

    return NextResponse.json({
      totalAthletes: athletes.length,
      divisionCounts,
      athletesByDivision,
      athletes,
    })
  } catch (error) {
    console.error("Error in athlete-division-check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
