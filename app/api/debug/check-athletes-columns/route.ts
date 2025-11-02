import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get one athlete to see the structure
    const { data: athletes, error } = await supabase.from("athletes").select("*").limit(1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const sampleAthlete = athletes?.[0] || {}
    const columns = Object.keys(sampleAthlete)

    return NextResponse.json({
      columns,
      sampleData: sampleAthlete,
      totalAthletes: athletes?.length || 0,
    })
  } catch (error) {
    console.error("Error checking athletes columns:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
