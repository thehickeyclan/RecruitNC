import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Function to convert grade number to grade name
function formatGradeLevel(grade: string): string {
  const gradeMap: { [key: string]: string } = {
    "9": "Freshman",
    "10": "Sophomore",
    "11": "Junior",
    "12": "Senior",
  }
  return gradeMap[grade] || grade
}

export async function POST(request: NextRequest) {
  try {
    const { athleteId, athleteName, athleteSchool, yearData } = await request.json()

    if (!athleteId || !yearData || yearData.length === 0) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    const results = {
      successful: 0,
      failed: 0,
      totalMatches: 0,
      yearsUploaded: 0,
      details: [] as any[],
    }

    // Process each year's data
    for (const year of yearData) {
      if (!year.jsonData.trim()) {
        results.details.push({
          year: year.year,
          success: false,
          message: "No JSON data provided",
        })
        continue
      }

      try {
        const matchData = JSON.parse(year.jsonData)

        // Handle the specific JSON structure from your wrestling data
        const matches = matchData.matches || []
        const wrestlerInfo = matchData.wrestler_info || {}
        const seasonSummary = matchData.season_summary || {}

        if (matches.length === 0) {
          results.details.push({
            year: year.year,
            success: false,
            message: "No matches found in JSON data - check format",
          })
          results.failed++
          continue
        }

        // Create a single record for this year with all matches as JSONB
        // This matches the actual table structure from the SQL file
        const matchRecord = {
          wrestler_id: `${athleteName.replace(/\s+/g, "_")}_${wrestlerInfo.season || year.year}`,
          first_name: athleteName.split(" ")[0] || athleteName,
          last_name: athleteName.split(" ").slice(1).join(" ") || "",
          season: wrestlerInfo.season || `${year.year} Year`,
          grade: formatGradeLevel(year.grade),
          high_school: athleteSchool,

          // Season summary stats
          total_matches: seasonSummary.total_matches || matches.length,
          wins: seasonSummary.wins || 0,
          losses: seasonSummary.losses || 0,
          pins: seasonSummary.pins || 0,
          tech_falls: seasonSummary.tech_falls || 0,
          decisions: seasonSummary.decisions || 0,
          major_decisions: seasonSummary.major_decisions || 0,
          forfeits_won: seasonSummary.forfeits_won || 0,
          pin_percentage: Number.parseFloat(seasonSummary.pin_percentage) || 0,
          tf_percentage: Number.parseFloat(seasonSummary.tf_percentage) || 0,
          finishing_percentage: Number.parseFloat(seasonSummary.finishing_percentage) || 0,

          // Store all individual matches as JSONB
          matches: matches,
        }

        // Insert the single record for this year
        const { error: insertError } = await supabase.from("matches").insert([matchRecord])

        if (insertError) {
          console.error(`Error inserting ${year.year} matches:`, insertError)
          results.details.push({
            year: year.year,
            success: false,
            message: `Database error: ${insertError.message}`,
          })
          results.failed++
        } else {
          results.details.push({
            year: year.year,
            success: true,
            message: `Successfully uploaded ${matches.length} matches (${seasonSummary.wins || 0}-${seasonSummary.losses || 0})`,
          })
          results.successful++
          results.totalMatches += matches.length
          results.yearsUploaded++
        }
      } catch (parseError) {
        console.error(`Error parsing ${year.year} JSON:`, parseError)
        results.details.push({
          year: year.year,
          success: false,
          message: `Invalid JSON format: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
        })
        results.failed++
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error executing upload:", error)
    return NextResponse.json(
      {
        error: "Failed to execute upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
