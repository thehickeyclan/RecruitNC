import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log("=== UPLOADING MATCH DATA ===")
    console.log("Received data keys:", Object.keys(data))

    // Validate the data structure
    if (!data.wrestler_info || !data.season_summary || !data.matches) {
      return Response.json({
        success: false,
        error: "Missing required fields",
        required: ["wrestler_info", "season_summary", "matches"],
        received: Object.keys(data),
      })
    }

    // Transform the data to match the table structure
    const matchRecord = {
      wrestler_id: `${data.wrestler_info.first_name}_${data.wrestler_info.last_name}_${data.wrestler_info.season}`
        .toLowerCase()
        .replace(/\s+/g, "_"),
      first_name: data.wrestler_info.first_name,
      last_name: data.wrestler_info.last_name,
      season: data.wrestler_info.season,
      grade: data.wrestler_info.grade,
      high_school: data.wrestler_info.high_school,
      total_matches: Number.parseInt(data.season_summary.total_matches),
      wins: Number.parseInt(data.season_summary.wins),
      losses: Number.parseInt(data.season_summary.losses),
      pins: Number.parseInt(data.season_summary.pins),
      tech_falls: Number.parseInt(data.season_summary.tech_falls),
      decisions: Number.parseInt(data.season_summary.decisions),
      major_decisions: Number.parseInt(data.season_summary.major_decisions),
      forfeits_won: Number.parseInt(data.season_summary.forfeits_won),
      pin_percentage: Number.parseFloat(data.season_summary.pin_percentage),
      tf_percentage: Number.parseFloat(data.season_summary.tf_percentage),
      finishing_percentage: Number.parseFloat(data.season_summary.finishing_percentage),
      matches: data.matches,
    }

    console.log("Transformed record for wrestler:", matchRecord.wrestler_id)

    // Try to insert the record
    const { data: insertedData, error: insertError } = await supabase.from("matches").insert(matchRecord).select()

    if (insertError) {
      console.error("Insert error:", insertError)
      return Response.json({
        success: false,
        error: "Failed to insert match data",
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
        attempted_data: {
          wrestler_id: matchRecord.wrestler_id,
          first_name: matchRecord.first_name,
          last_name: matchRecord.last_name,
          total_matches: matchRecord.total_matches,
        },
      })
    }

    console.log("Successfully inserted match data!")

    return Response.json({
      success: true,
      message: `✅ Successfully uploaded ${matchRecord.total_matches} matches for ${matchRecord.first_name} ${matchRecord.last_name}`,
      wrestler_id: matchRecord.wrestler_id,
      inserted_data: insertedData,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return Response.json({
      success: false,
      error: "Failed to process upload",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
