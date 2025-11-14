import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all unique division values
    const { data, error } = await supabase.from("athletes").select("division").not("division", "is", null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count occurrences of each division
    const divisionCounts: Record<string, number> = {}

    data.forEach((item) => {
      const division = item.division || "Empty"
      divisionCounts[division] = (divisionCounts[division] || 0) + 1
    })

    // Sort by count (descending)
    const sortedDivisions = Object.entries(divisionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([division, count]) => ({ division, count }))

    return NextResponse.json({
      success: true,
      totalAthletes: data.length,
      uniqueDivisions: sortedDivisions.length,
      divisions: sortedDivisions,
    })
  } catch (error) {
    console.error("Error in check-divisions API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}
