import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST() {
  try {
    console.log("Attempting to link match data to athlete profiles...")

    // Get all match records that don't have athlete_id set
    const { data: unlinkedMatches, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .is("athlete_id", null)

    if (matchError) {
      console.error("Error fetching unlinked matches:", matchError)
      return NextResponse.json({ error: "Failed to fetch unlinked matches" })
    }

    console.log(`Found ${unlinkedMatches?.length || 0} unlinked match records`)

    // Get all athletes for name matching
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, first_name, last_name")

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athletes" })
    }

    console.log(`Found ${athletes?.length || 0} athletes`)

    let linkedCount = 0
    const linkResults = []

    // Try to match each unlinked match to an athlete
    for (const match of unlinkedMatches || []) {
      if (!match.athlete_name) continue

      // Try to find matching athlete
      const matchingAthlete = athletes?.find((athlete) => {
        const athleteName = athlete.name || `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim()
        return athleteName.toLowerCase() === match.athlete_name.toLowerCase()
      })

      if (matchingAthlete) {
        // Update the match record with athlete_id
        const { error: updateError } = await supabase
          .from("matches")
          .update({ athlete_id: matchingAthlete.id })
          .eq("id", match.id)

        if (updateError) {
          console.error(`Error linking match ${match.id} to athlete ${matchingAthlete.id}:`, updateError)
          linkResults.push({
            matchId: match.id,
            athleteName: match.athlete_name,
            success: false,
            error: updateError.message,
          })
        } else {
          linkedCount++
          linkResults.push({
            matchId: match.id,
            athleteName: match.athlete_name,
            athleteId: matchingAthlete.id,
            success: true,
          })
        }
      } else {
        linkResults.push({
          matchId: match.id,
          athleteName: match.athlete_name,
          success: false,
          error: "No matching athlete found",
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalUnlinkedMatches: unlinkedMatches?.length || 0,
      linkedCount,
      linkResults: linkResults.slice(0, 50), // Limit results for readability
      summary: {
        successfulLinks: linkResults.filter((r) => r.success).length,
        failedLinks: linkResults.filter((r) => !r.success).length,
      },
    })
  } catch (error) {
    console.error("Error in fix-missing-match-links:", error)
    return NextResponse.json({ error: "Internal server error" })
  }
}
