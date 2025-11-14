import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    console.log("=== MATCH UPLOAD START ===")

    const body = await request.json()
    console.log("Request body keys:", Object.keys(body))
    console.log("Wrestler info:", body.wrestler_info)
    console.log("Season summary:", body.season_summary)
    console.log("Matches count:", body.matches?.length)

    // Validate required fields
    if (!body.wrestler_info || !body.season_summary || !body.matches) {
      return Response.json({
        success: false,
        error: "Missing required fields: wrestler_info, season_summary, or matches",
      })
    }

    const { wrestler_info, season_summary, matches } = body

    // Generate wrestler_id
    const wrestler_id = `${wrestler_info.first_name}_${wrestler_info.last_name}_${wrestler_info.season}`
    console.log("Generated wrestler_id:", wrestler_id)

    // Prepare data for insertion
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

    console.log("Inserting data for:", wrestler_id)

    // Insert data directly - skip table check since it should exist
    const { data, error } = await supabase.from("matches").insert(matchData).select()

    if (error) {
      console.error("Database insert error:", error)

      // If table doesn't exist, provide SQL
      if (error.code === "42P01") {
        return Response.json({
          success: false,
          error: "Matches table does not exist. Please create it first.",
          sql: `CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wrestler_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  season TEXT,
  grade TEXT,
  high_school TEXT,
  total_matches INTEGER,
  wins INTEGER,
  losses INTEGER,
  pins INTEGER,
  tech_falls INTEGER,
  decisions INTEGER,
  major_decisions INTEGER,
  forfeits_won INTEGER,
  pin_percentage DECIMAL(5,2),
  tf_percentage DECIMAL(5,2),
  finishing_percentage DECIMAL(5,2),
  matches JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);`,
          instructions: [
            "Go to your Supabase dashboard",
            "Click on 'SQL Editor'",
            "Paste the SQL above and run it",
            "Come back and try uploading again",
          ],
        })
      }

      return Response.json({
        success: false,
        error: "Failed to insert match data",
        details: error.message,
        code: error.code,
      })
    }

    console.log("Insert successful:", data)

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
      },
      { status: 500 },
    )
  }
}
