import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("Checking match data for all athletes...")

    // Get all athletes
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, first_name, last_name")
      .order("name")

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athletes" })
    }

    console.log(`Found ${athletes?.length || 0} athletes`)

    // Check match data for each athlete
    const results = []

    for (const athlete of athletes || []) {
      const athleteName = athlete.name || `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim()

      // Check if athlete has match data
      const { data: matches, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("athlete_id", athlete.id)

      if (matchError) {
        console.error(`Error checking matches for ${athleteName}:`, matchError)
        results.push({
          id: athlete.id,
          name: athleteName,
          hasMatches: false,
          matchCount: 0,
          error: matchError.message,
        })
      } else {
        results.push({
          id: athlete.id,
          name: athleteName,
          hasMatches: (matches?.length || 0) > 0,
          matchCount: matches?.length || 0,
          seasons: matches?.map((m) => m.season).filter((v, i, a) => a.indexOf(v) === i) || [],
        })
      }
    }

    // Summary stats
    const withMatches = results.filter((r) => r.hasMatches)
    const withoutMatches = results.filter((r) => !r.hasMatches)

    return NextResponse.json({
      success: true,
      summary: {
        totalAthletes: results.length,
        athletesWithMatches: withMatches.length,
        athletesWithoutMatches: withoutMatches.length,
        percentageWithMatches: ((withMatches.length / results.length) * 100).toFixed(1),
      },
      athletesWithMatches: withMatches,
      athletesWithoutMatches: withoutMatches.slice(0, 20), // Limit to first 20 for readability
      allResults: results,
    })
  } catch (error) {
    console.error("Error in check-all-athlete-matches:", error)
    return NextResponse.json({ error: "Internal server error" })
  }
}
