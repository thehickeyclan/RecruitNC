import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Search for Colt Campbell in athletes table
    const { data: athletes, error: athleteError } = await supabase
      .from("athletes")
      .select("*")
      .or("name.ilike.%colt%campbell%,firstName.ilike.%colt%,lastName.ilike.%campbell%")

    // Also check what match records exist
    const { data: matchRecords, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .or("first_name.ilike.%colt%,last_name.ilike.%campbell%,wrestler_id.ilike.%colt%")

    // Get some sample match records to see the structure
    const { data: sampleMatches, error: sampleError } = await supabase.from("matches").select("*").limit(3)

    return NextResponse.json({
      success: true,
      allCandidates: athletes || [],
      athlete: athletes?.[0] || null,
      sampleMatchRecords: matchRecords || [],
      sampleMatches: sampleMatches || [],
      athleteError: athleteError?.message,
      matchError: matchError?.message,
    })
  } catch (error) {
    console.error("Error in find-colt-campbell:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
