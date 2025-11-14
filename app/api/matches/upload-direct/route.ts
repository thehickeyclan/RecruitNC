import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("=== DIRECT UPLOAD - TABLE EXISTS ===")
    console.log("Full body received:", JSON.stringify(body, null, 2))

    // Validate required fields
    if (!body.wrestler_info || !body.season_summary || !body.matches) {
      return Response.json({
        success: false,
        error: "Missing required fields: wrestler_info, season_summary, or matches",
        received_keys: Object.keys(body),
      })
    }

    const { wrestler_info, season_summary, matches } = body

    // Generate wrestler_id
    const wrestler_id = `${wrestler_info.first_name}_${wrestler_info.last_name}_${wrestler_info.season}`

    // Prepare data for insertion - EXACTLY matching your table structure
    const matchData = {
      wrestler_id,
      first_name: wrestler_info.first_name,
      last_name: wrestler_info.last_name,
      season: wrestler_info.season,
      grade: wrestler_info.grade,
      high_school: wrestler_info.high_school,
      total_matches: season_summary.total_matches,
      wins: season_summary.wins,
      losses: season_summary.losses,
      pins: season_summary.pins,
      tech_falls: season_summary.tech_falls,
      decisions: season_summary.decisions,
      major_decisions: season_summary.major_decisions,
      forfeits_won: season_summary.forfeits_won,
      pin_percentage: season_summary.pin_percentage,
      tf_percentage: season_summary.tf_percentage,
      finishing_percentage: season_summary.finishing_percentage,
      matches: matches,
    }

    console.log("Prepared match data:", JSON.stringify(matchData, null, 2))

    // First, let's check if the table exists by trying a simple select
    console.log("Testing table access...")
    const { data: testData, error: testError } = await supabase.from("matches").select("id").limit(1)

    if (testError) {
      console.error("Table access test failed:", testError)
      return Response.json({
        success: false,
        error: "Cannot access matches table",
        details: testError.message,
        code: testError.code,
        hint: testError.hint,
      })
    }

    console.log("Table access successful, proceeding with insert...")

    // Insert data directly into the existing table
    const { data, error } = await supabase.from("matches").insert(matchData).select()

    if (error) {
      console.error("Insert error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      return Response.json({
        success: false,
        error: "Failed to insert match data",
        details: error.message,
        code: error.code,
        hint: error.hint,
        data_attempted: matchData,
      })
    }

    console.log("Insert successful!", data)

    return Response.json({
      success: true,
      message: `✅ Successfully uploaded ${season_summary.total_matches} matches for ${wrestler_info.first_name} ${wrestler_info.last_name} (${wrestler_info.season})`,
      wrestler_id,
      total_matches: season_summary.total_matches,
      data,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json(
      {
        success: false,
        error: "Failed to process upload",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
