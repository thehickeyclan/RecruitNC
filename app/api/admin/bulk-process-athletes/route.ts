import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Get all athletes
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, careerRecord")
      .order("name")

    if (athletesError) {
      throw athletesError
    }

    // Get all match records
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("wrestler_id, first_name, last_name")

    if (matchesError) {
      throw matchesError
    }

    // Create a set of wrestler IDs that have match data
    const wrestlerIdsWithMatches = new Set(matches?.map((m) => m.wrestler_id) || [])

    // Check each athlete
    const athleteStatus =
      athletes?.map((athlete) => {
        const wrestlerId = `${athlete.name.toLowerCase().replace(/\s+/g, "_")}_001`
        const hasMatchData = wrestlerIdsWithMatches.has(wrestlerId)

        return {
          id: athlete.id,
          name: athlete.name,
          hasMatchData,
          careerRecord: athlete.careerRecord,
          matchCount: hasMatchData ? 1 : 0,
        }
      }) || []

    return NextResponse.json({
      success: true,
      athletes: athleteStatus,
      summary: {
        total: athleteStatus.length,
        withData: athleteStatus.filter((a) => a.hasMatchData).length,
        withoutData: athleteStatus.filter((a) => !a.hasMatchData).length,
      },
    })
  } catch (error) {
    console.error("Error checking athletes:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get all athletes from the database
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, firstName, lastName, highschool, graduationyear, weightclass")
      .order("name")

    if (athletesError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch athletes: ${athletesError.message}`,
      })
    }

    if (!athletes || athletes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No athletes found in database",
      })
    }

    // Get existing match records to avoid duplicates
    const { data: existingMatches, error: matchesError } = await supabase.from("matches").select("wrestler_id")

    if (matchesError) {
      return NextResponse.json({
        success: false,
        error: `Failed to check existing matches: ${matchesError.message}`,
      })
    }

    const existingWrestlerIds = new Set(existingMatches?.map((m) => m.wrestler_id) || [])

    // Filter athletes who need match data (don't already have records)
    const athletesNeedingData = athletes.filter((athlete) => {
      const firstName = athlete.firstName || athlete.name?.split(" ")[0] || "unknown"
      const lastName = athlete.lastName || athlete.name?.split(" ").slice(1).join(" ") || "unknown"
      const wrestlerId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_001`

      return !existingWrestlerIds.has(wrestlerId)
    })

    if (athletesNeedingData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All athletes already have match data",
        processed: 0,
        totalAthletes: athletes.length,
        athletesWithData: athletes.length,
      })
    }

    // Process athletes in batches to avoid timeout
    const batchSize = 25
    const batches = []
    for (let i = 0; i < athletesNeedingData.length; i += batchSize) {
      batches.push(athletesNeedingData.slice(i, i + batchSize))
    }

    let totalProcessed = 0
    const errors = []

    // Process first batch only to avoid timeout
    const firstBatch = batches[0] || []

    for (const athlete of firstBatch) {
      try {
        const firstName = athlete.firstName || athlete.name?.split(" ")[0] || "Unknown"
        const lastName = athlete.lastName || athlete.name?.split(" ").slice(1).join(" ") || "Unknown"
        const wrestlerId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_001`

        // Generate realistic 4-year career data for this specific athlete
        const seasons = generateAthleteCareerData(athlete)

        const wrestlerRecord = {
          wrestler_id: wrestlerId,
          first_name: firstName,
          last_name: lastName,
          high_school: athlete.highschool || "Unknown High School",
          wrestler: {
            seasons: seasons,
          },
        }

        // Insert this athlete's record
        const { error: insertError } = await supabase.from("matches").insert([wrestlerRecord])

        if (insertError) {
          errors.push(`${athlete.name}: ${insertError.message}`)
        } else {
          totalProcessed++

          // Update athlete with career record
          const careerRecord = calculateCareerRecord(seasons)
          await supabase.from("athletes").update({ careerRecord }).eq("id", athlete.id)
        }
      } catch (error) {
        errors.push(`${athlete.name}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${totalProcessed} athletes`,
      processed: totalProcessed,
      totalNeedingData: athletesNeedingData.length,
      remainingBatches: batches.length - 1,
      errors: errors.length > 0 ? errors.slice(0, 5) : [],
      note: batches.length > 1 ? "Run again to process remaining athletes" : "All athletes processed",
    })
  } catch (error) {
    console.error("Error in bulk-process-athletes:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
}

function generateAthleteCareerData(athlete: any) {
  const gradYear = athlete.graduationyear || 2025
  const currentYear = new Date().getFullYear()

  const seasons: any = {}

  // Generate 4 years of high school data
  const years = [
    { grade: "freshman", year: gradYear - 4, season: `${gradYear - 4}-${String(gradYear - 3).slice(-2)}` },
    { grade: "sophomore", year: gradYear - 3, season: `${gradYear - 3}-${String(gradYear - 2).slice(-2)}` },
    { grade: "junior", year: gradYear - 2, season: `${gradYear - 2}-${String(gradYear - 1).slice(-2)}` },
    { grade: "senior", year: gradYear - 1, season: `${gradYear - 1}-${String(gradYear).slice(-2)}` },
  ]

  years.forEach(({ grade, year, season }, index) => {
    // Only generate data for reasonable years (2020 onwards)
    if (year >= 2020 && year <= currentYear + 1) {
      const yearLevel = index + 1 // 1-4 for progression

      // Realistic match counts
      const baseMatches = 35 + Math.floor(Math.random() * 25) // 35-60 matches

      // Win rate improves over time: 60-85%
      const baseWinRate = 0.6 + yearLevel * 0.06 + Math.random() * 0.1
      const winRate = Math.min(0.9, baseWinRate)

      const totalMatches = baseMatches
      const wins = Math.floor(totalMatches * winRate)
      const losses = totalMatches - wins

      // Pin rate: 25-45% of wins
      const pinRate = 0.25 + yearLevel * 0.05 + Math.random() * 0.1
      const pins = Math.floor(wins * Math.min(0.5, pinRate))

      // Tech fall rate: 5-15% of wins
      const techFallRate = 0.05 + Math.random() * 0.1
      const techFalls = Math.floor(wins * techFallRate)

      const decisions = Math.max(0, wins - pins - techFalls)

      seasons[grade] = {
        season: season,
        grade: grade.charAt(0).toUpperCase() + grade.slice(1),
        total_matches: totalMatches,
        wins: wins,
        losses: losses,
        pins: pins,
        tech_falls: techFalls,
        decisions: decisions,
        major_decisions: Math.floor(decisions * 0.15), // 15% of decisions are majors
        forfeits_won: Math.floor(Math.random() * 3),
        win_percentage: Math.round(winRate * 1000) / 10, // Round to 1 decimal
        matches: [], // Individual matches would go here
      }
    }
  })

  return seasons
}

function calculateCareerRecord(seasons: any) {
  let totalWins = 0
  let totalLosses = 0

  Object.values(seasons).forEach((season: any) => {
    totalWins += season.wins || 0
    totalLosses += season.losses || 0
  })

  return `${totalWins}-${totalLosses}`
}
