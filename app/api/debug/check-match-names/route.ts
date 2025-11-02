import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Get all match records to see what names exist
    const { data: allMatches, error: matchError } = await supabase
      .from("matches")
      .select("wrestler_id, first_name, last_name, high_school, total_matches, wins, losses")
      .order("wrestler_id")

    // Get all athletes to compare
    const { data: allAthletes, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name, firstName, lastName, highschool, careerRecord")
      .order("name")

    // Look for Colt Campbell specifically
    const coltMatches = allMatches?.filter(
      (match) =>
        match.first_name?.toLowerCase().includes("colt") || match.last_name?.toLowerCase().includes("campbell"),
    )

    const coltAthletes = allAthletes?.filter(
      (athlete) =>
        athlete.name?.toLowerCase().includes("colt") ||
        athlete.firstName?.toLowerCase().includes("colt") ||
        athlete.lastName?.toLowerCase().includes("campbell"),
    )

    return NextResponse.json({
      success: true,
      totalMatches: allMatches?.length || 0,
      totalAthletes: allAthletes?.length || 0,
      coltMatches: coltMatches || [],
      coltAthletes: coltAthletes || [],
      sampleMatches: allMatches?.slice(0, 5) || [],
      sampleAthletes: allAthletes?.slice(0, 5) || [],
      matchError: matchError?.message,
      athleteError: athleteError?.message,
    })
  } catch (error) {
    console.error("Error in check-match-names:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
