import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface MatchData {
  wrestler_info: {
    first_name: string
    last_name: string
    season: string
    grade: string
    high_school: string
  }
  season_summary: {
    total_matches: number
    wins: number
    losses: number
    pins: number
    tech_falls: number
    decisions: number
    major_decisions: number
    forfeits_won: number
    pin_percentage: number
    tf_percentage: number
    finishing_percentage: number
  }
  matches: Array<{
    date: string
    weight: number
    opponent: string
    opponent_school: string
    result: string
    venue: string
    win_loss: string
    opponent_percentage: string
  }>
}

export async function POST(request: Request) {
  try {
    const { matchDataArray }: { matchDataArray: MatchData[] } = await request.json()

    if (!Array.isArray(matchDataArray) || matchDataArray.length === 0) {
      return Response.json({ error: "No match data provided" }, { status: 400 })
    }

    // Transform data for bulk insert
    const recordsToInsert = matchDataArray.map((data) => {
      const wrestlerId = `${data.wrestler_info.first_name}_${data.wrestler_info.last_name}_${data.wrestler_info.season}`

      return {
        wrestler_id: wrestlerId,
        first_name: data.wrestler_info.first_name,
        last_name: data.wrestler_info.last_name,
        season: data.wrestler_info.season,
        grade: data.wrestler_info.grade,
        high_school: data.wrestler_info.high_school,
        total_matches: data.season_summary.total_matches,
        wins: data.season_summary.wins,
        losses: data.season_summary.losses,
        pins: data.season_summary.pins,
        tech_falls: data.season_summary.tech_falls,
        decisions: data.season_summary.decisions,
        major_decisions: data.season_summary.major_decisions,
        forfeits_won: data.season_summary.forfeits_won,
        pin_percentage: data.season_summary.pin_percentage,
        tf_percentage: data.season_summary.tf_percentage,
        finishing_percentage: data.season_summary.finishing_percentage,
        matches: data.matches,
      }
    })

    // Bulk insert with upsert for speed
    const { data, error } = await supabase
      .from("matches")
      .upsert(recordsToInsert, {
        onConflict: "wrestler_id",
        ignoreDuplicates: false,
      })
      .select("wrestler_id, first_name, last_name, season")

    if (error) {
      console.error("Bulk insert error:", error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Group results by wrestler
    const wrestlerCounts: Record<string, number> = {}
    data?.forEach((record) => {
      const key = `${record.first_name} ${record.last_name}`
      wrestlerCounts[key] = (wrestlerCounts[key] || 0) + 1
    })

    return Response.json({
      success: true,
      message: `Successfully uploaded ${recordsToInsert.length} match records`,
      recordsCreated: recordsToInsert.length,
      wrestlerCounts,
      uploadedRecords: data,
    })
  } catch (error) {
    console.error("Bulk upload error:", error)
    return Response.json(
      {
        error: "Failed to upload match data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
