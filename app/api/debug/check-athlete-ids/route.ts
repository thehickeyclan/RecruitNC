import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // First, let's check if we can connect to the database at all
    const { data: connectionTest, error: connectionError } = await supabase.from("athletes").select("count").limit(1)

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: connectionError.message,
      })
    }

    // Get total count of athletes
    const { count: totalAthletes, error: countError } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })

    if (countError) {
      return NextResponse.json({
        success: false,
        error: "Failed to count athletes",
        details: countError.message,
      })
    }

    // Search for Liam Hickey with multiple name variations
    const { data: liamResults, error: liamError } = await supabase
      .from("athletes")
      .select("id, name, first_name, last_name, firstName, lastName, highschool, club, college, claimed_by_user_id")
      .or("name.ilike.%liam%hickey%,first_name.ilike.%liam%,firstName.ilike.%liam%")
      .limit(10)

    // Get some sample athletes to show UUID format
    const { data: sampleAthletes, error: sampleError } = await supabase
      .from("athletes")
      .select("id, name, first_name, last_name, firstName, lastName, highschool, club, college, claimed_by_user_id")
      .limit(5)

    return NextResponse.json({
      success: true,
      totalAthletes: totalAthletes || 0,
      liamHickeyResults: liamResults || [],
      sampleAthletes: sampleAthletes || [],
      errors: {
        liamError: liamError?.message || null,
        sampleError: sampleError?.message || null,
      },
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({
      success: false,
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
