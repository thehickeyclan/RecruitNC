import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get all athletes
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, graduationyear")
      .order("name")

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ success: false, error: "Failed to fetch athletes" })
    }

    // Get all match records
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("wrestler_id, first_name, last_name, season, grade, total_matches, matches")
      .order("created_at", { ascending: false })

    if (matchesError) {
      console.error("Error fetching matches:", matchesError)
      return NextResponse.json({ success: false, error: "Failed to fetch matches" })
    }

    // Process progress for each athlete
    const progress = athletes.map((athlete) => {
      const athleteProgress = {
        athleteId: athlete.id,
        athleteName: athlete.name,
        years: {} as { [year: string]: { uploaded: boolean; matchCount: number; grade?: string; season?: string } },
        totalMatches: 0,
        matchesFound: 0,
      }

      // Calculate expected years based on graduation year
      const graduationYear = athlete.graduationyear
      const expectedYears = graduationYear
        ? [
            { year: graduationYear - 3, grade: "Freshman" },
            { year: graduationYear - 2, grade: "Sophomore" },
            { year: graduationYear - 1, grade: "Junior" },
            { year: graduationYear, grade: "Senior" },
          ]
        : []

      // Initialize all years as not uploaded
      expectedYears.forEach((yearInfo) => {
        athleteProgress.years[yearInfo.year.toString()] = {
          uploaded: false,
          matchCount: 0,
          grade: yearInfo.grade,
        }
      })

      // Find matches for this athlete using multiple matching strategies
      const athleteMatches = matches.filter((match) => {
        const fullName = `${match.first_name} ${match.last_name}`.toLowerCase()
        const athleteName = athlete.name.toLowerCase()

        // Strategy 1: Exact name match
        if (fullName === athleteName) return true

        // Strategy 2: First name + last name parts match
        const nameParts = athleteName.split(" ")
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(" ")

        if (
          match.first_name.toLowerCase() === firstName &&
          match.last_name.toLowerCase().includes(lastName.toLowerCase())
        ) {
          return true
        }

        // Strategy 3: Partial name match (for cases like "Adrian Fox" vs "Adrian" + "Fox")
        if (
          athleteName.includes(match.first_name.toLowerCase()) &&
          athleteName.includes(match.last_name.toLowerCase())
        ) {
          return true
        }

        return false
      })

      athleteProgress.matchesFound = athleteMatches.length

      // Process found matches
      athleteMatches.forEach((match) => {
        // Extract year from season (e.g., "2023-24" -> 2024)
        let year = null
        if (match.season && match.season.includes("-")) {
          const seasonParts = match.season.split("-")
          if (seasonParts.length === 2) {
            const yearPart = seasonParts[1]
            year = 2000 + Number.parseInt(yearPart)
          }
        }

        if (year && athleteProgress.years[year.toString()]) {
          athleteProgress.years[year.toString()] = {
            uploaded: true,
            matchCount: match.total_matches || (match.matches ? match.matches.length : 0),
            grade: match.grade,
            season: match.season,
          }
          athleteProgress.totalMatches += match.total_matches || 0
        }
      })

      return athleteProgress
    })

    // Debug information
    const debug = {
      totalAthletes: athletes.length,
      totalMatchRecords: matches.length,
      sampleMatches: matches.slice(0, 3).map((m) => ({
        wrestler_id: m.wrestler_id,
        name: `${m.first_name} ${m.last_name}`,
        season: m.season,
        grade: m.grade,
        total_matches: m.total_matches,
      })),
      athletesWithMatches: progress.filter((p) => p.matchesFound > 0).length,
      matchingStrategies: [
        "1. Exact full name match",
        "2. First name + partial last name match",
        "3. Partial name inclusion match",
      ],
    }

    return NextResponse.json({
      success: true,
      progress,
      debug,
    })
  } catch (error) {
    console.error("Error in match upload progress:", error)
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
