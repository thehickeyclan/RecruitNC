import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function formatGradeLevel(grade: string | number): string {
  const gradeNum = typeof grade === "string" ? Number.parseInt(grade) : grade

  switch (gradeNum) {
    case 9:
      return "Freshman"
    case 10:
      return "Sophomore"
    case 11:
      return "Junior"
    case 12:
      return "Senior"
    default:
      return grade.toString()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { athleteData, profileMatches } = await request.json()

    const results = {
      successful: 0,
      failed: 0,
      details: [],
    }

    for (let i = 0; i < athleteData.length; i++) {
      const athlete = athleteData[i]
      const profileMatch = profileMatches[i]

      try {
        if (!profileMatch || !profileMatch.athlete_id) {
          results.failed++
          results.details.push({
            athlete: athlete.name,
            success: false,
            message: "No profile match found",
          })
          continue
        }

        // Process matches for this athlete
        const matchesToInsert = []

        if (athlete.matches && Array.isArray(athlete.matches)) {
          for (const match of athlete.matches) {
            matchesToInsert.push({
              athlete_id: profileMatch.athlete_id,
              opponent_name: match.opponent || "Unknown",
              result: match.result || "Unknown",
              win_type: match.win_type || null,
              tournament: match.tournament || null,
              date: match.date || null,
              season: match.season || null,
              grade_level: formatGradeLevel(match.grade_level || match.grade || ""),
              weight_class: match.weight_class || match.weight || null,
              team_score: match.team_score || null,
              notes: match.notes || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        }

        // Insert matches in batches
        if (matchesToInsert.length > 0) {
          const { error: matchError } = await supabase.from("matches").insert(matchesToInsert)

          if (matchError) {
            console.error("Error inserting matches:", matchError)
            results.failed++
            results.details.push({
              athlete: athlete.name,
              success: false,
              message: `Failed to insert matches: ${matchError.message}`,
            })
            continue
          }
        }

        results.successful++
        results.details.push({
          athlete: athlete.name,
          success: true,
          message: `Uploaded ${matchesToInsert.length} matches`,
        })
      } catch (error) {
        console.error(`Error processing athlete ${athlete.name}:`, error)
        results.failed++
        results.details.push({
          athlete: athlete.name,
          success: false,
          message: `Processing error: ${error.message}`,
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error executing bulk upload:", error)
    return NextResponse.json({ error: "Failed to execute upload" }, { status: 500 })
  }
}
