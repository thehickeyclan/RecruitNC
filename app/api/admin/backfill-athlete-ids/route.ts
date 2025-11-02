import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Get all matches that don't have athlete_id set
    const { data: matchesWithoutAthleteId, error: matchesError } = await supabase
      .from("matches")
      .select("id, wrestler_id, first_name, last_name, season")
      .is("athlete_id", null)

    if (matchesError) {
      console.error("Error fetching matches:", matchesError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch matches without athlete_id",
          details: matchesError.message,
        },
        { status: 500 },
      )
    }

    if (!matchesWithoutAthleteId || matchesWithoutAthleteId.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All matches already have athlete_id assigned",
        matchesProcessed: 0,
      })
    }

    // Get all athletes for matching
    const { data: athletes, error: athletesError } = await supabase.from("athletes").select("id, name")

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch athletes",
          details: athletesError.message,
        },
        { status: 500 },
      )
    }

    const updates = []
    const matchLog = []

    // Process each match and try to find matching athlete
    for (const match of matchesWithoutAthleteId) {
      let matchedAthlete = null
      const fullMatchName = `${match.first_name} ${match.last_name}`.trim()

      // Try to match with athletes
      for (const athlete of athletes) {
        const athleteName = athlete.name.trim()

        // Strategy 1: Exact name match
        if (fullMatchName.toLowerCase() === athleteName.toLowerCase()) {
          matchedAthlete = athlete
          break
        }

        // Strategy 2: Check if wrestler_id contains athlete name parts
        if (match.wrestler_id) {
          const wrestlerIdLower = match.wrestler_id.toLowerCase()
          const athleteNameLower = athleteName.toLowerCase()

          // Remove spaces and check if athlete name parts are in wrestler_id
          const athleteNameParts = athleteNameLower.split(" ")
          const allPartsMatch = athleteNameParts.every((part) => part.length > 1 && wrestlerIdLower.includes(part))

          if (allPartsMatch && athleteNameParts.length >= 2) {
            matchedAthlete = athlete
            break
          }
        }

        // Strategy 3: Partial match for common name variations
        const firstNameMatch = match.first_name.toLowerCase() === athleteName.split(" ")[0]?.toLowerCase()
        const lastNameMatch = match.last_name.toLowerCase() === athleteName.split(" ").slice(-1)[0]?.toLowerCase()

        if (firstNameMatch && lastNameMatch) {
          matchedAthlete = athlete
          break
        }
      }

      if (matchedAthlete) {
        updates.push({
          matchId: match.id,
          athleteId: matchedAthlete.id,
          matchName: fullMatchName,
          athleteName: matchedAthlete.name,
          wrestlerId: match.wrestler_id,
          season: match.season,
        })
      } else {
        matchLog.push({
          matchId: match.id,
          matchName: fullMatchName,
          wrestlerId: match.wrestler_id,
          season: match.season,
          status: "No matching athlete found",
        })
      }
    }

    // Execute updates in batches
    let successCount = 0
    let errorCount = 0
    const errors = []

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("matches")
        .update({ athlete_id: update.athleteId })
        .eq("id", update.matchId)

      if (updateError) {
        errorCount++
        errors.push({
          matchId: update.matchId,
          matchName: update.matchName,
          error: updateError.message,
        })
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfill completed: ${successCount} matches updated, ${errorCount} errors`,
      stats: {
        totalMatches: matchesWithoutAthleteId.length,
        matchesFound: updates.length,
        matchesUpdated: successCount,
        matchesNotFound: matchLog.length,
        errors: errorCount,
      },
      matchLog: matchLog.slice(0, 15), // Show first 15 unmatched
      errors: errors.slice(0, 5), // Show first 5 errors
      updates: updates.slice(0, 15), // Show first 15 successful matches
    })
  } catch (error) {
    console.error("Error in backfill-athlete-ids:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
