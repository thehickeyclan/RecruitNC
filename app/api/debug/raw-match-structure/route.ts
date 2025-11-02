import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Get a few raw match records to understand the structure
    const { data: rawMatches, error } = await supabase.from("matches").select("*").limit(10)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: error.message, rawMatches: [], matchFields: [] })
    }

    // Also try to get some athlete data to understand the relationship
    const { data: athletes, error: athleteError } = await supabase
      .from("athletes")
      .select("id, first_name, last_name")
      .limit(5)

    return NextResponse.json({
      rawMatches: rawMatches || [],
      athletes: athletes || [],
      sampleMatch: rawMatches?.[0] || null,
      matchFields: rawMatches?.[0] ? Object.keys(rawMatches[0]) : [],
      totalMatches: rawMatches?.length || 0,
      athleteError: athleteError?.message || null,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      rawMatches: [],
      matchFields: [],
      totalMatches: 0,
    })
  }
}
