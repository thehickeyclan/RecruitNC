import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get a sample athlete to see the actual column structure
    const { data: sampleAthlete, error: sampleError } = await supabase.from("athletes").select("*").limit(1).single()

    if (sampleError) {
      return NextResponse.json({
        error: "Failed to fetch sample athlete",
        details: sampleError.message,
      })
    }

    // Get athletes with divisions to check division values
    const { data: divisionData, error: divisionError } = await supabase
      .from("athletes")
      .select("division")
      .not("division", "is", null)
      .limit(20)

    if (divisionError) {
      return NextResponse.json({
        error: "Failed to fetch division data",
        details: divisionError.message,
      })
    }

    // Get unique division values
    const uniqueDivisions = [...new Set(divisionData.map((d) => d.division))].filter(Boolean)

    return NextResponse.json({
      success: true,
      sampleAthlete,
      availableColumns: Object.keys(sampleAthlete),
      uniqueDivisions,
      totalAthletes: divisionData.length,
    })
  } catch (error) {
    return NextResponse.json({
      error: "Database check failed",
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
