import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("=== SUBMIT ATHLETE MATCHES DEBUG ===")
    console.log("Full request body:", JSON.stringify(body, null, 2))
    console.log("Body keys:", Object.keys(body))
    console.log("athleteId:", body.athleteId)
    console.log("wrestler_info:", body.wrestler_info)
    console.log("season_summary:", body.season_summary)
    console.log("matches:", body.matches ? `Array with ${body.matches.length} items` : "Missing")

    // Your format has: { athleteId, wrestler_info, season_summary, matches }
    const athleteId = body.athleteId
    const wrestlerInfo = body.wrestler_info
    const seasonSummary = body.season_summary
    const matches = body.matches

    console.log("=== VALIDATION CHECKS ===")
    console.log("athleteId check:", !!athleteId, athleteId)
    console.log("wrestlerInfo check:", !!wrestlerInfo, wrestlerInfo)
    console.log("seasonSummary check:", !!seasonSummary, seasonSummary)
    console.log("matches check:", !!matches && Array.isArray(matches), matches ? matches.length : "null")

    if (!athleteId) {
      console.log("❌ FAILED: Missing athleteId")
      return NextResponse.json(
        { success: false, error: "Missing athleteId - please select an athlete" },
        { status: 400 },
      )
    }

    if (!wrestlerInfo) {
      console.log("❌ FAILED: Missing wrestler_info")
      return NextResponse.json({ success: false, error: "Missing wrestler_info section" }, { status: 400 })
    }

    if (!seasonSummary) {
      console.log("❌ FAILED: Missing season_summary")
      return NextResponse.json({ success: false, error: "Missing season_summary section" }, { status: 400 })
    }

    if (!matches || !Array.isArray(matches)) {
      console.log("❌ FAILED: Missing or invalid matches array")
      return NextResponse.json({ success: false, error: "Missing or invalid matches array" }, { status: 400 })
    }

    console.log("✅ All validation checks passed")

    const supabase = await createClient()

    // Get athlete info for wrestler_id generation
    console.log("=== ATHLETE LOOKUP ===")
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("name")
      .eq("id", athleteId)
      .single()

    console.log("Athlete lookup result:", athlete, athleteError)

    if (athleteError || !athlete) {
      console.log("❌ FAILED: Athlete not found")
      return NextResponse.json({ success: false, error: "Athlete not found" }, { status: 404 })
    }

    // Generate wrestler_id from athlete name and season
    const wrestlerIdBase = athlete.name.toLowerCase().replace(/\s+/g, "_")
    const wrestlerId = `${wrestlerIdBase}_${wrestlerInfo.season}`
    console.log("Generated wrestler_id:", wrestlerId)

    // Delete existing matches for this athlete and season
    console.log("=== DELETING EXISTING MATCHES ===")
    const { error: deleteError } = await supabase
      .from("matches")
      .delete()
      .eq("athlete_id", athleteId)
      .eq("season", wrestlerInfo.season)

    if (deleteError) {
      console.log("Delete error (non-fatal):", deleteError)
    }

    // Prepare match record with athlete_id
    const matchRecord = {
      athlete_id: athleteId, // ✅ Direct relationship
      wrestler_id: wrestlerId,
      first_name: wrestlerInfo.first_name,
      last_name: wrestlerInfo.last_name,
      season: wrestlerInfo.season,
      grade: wrestlerInfo.grade,
      high_school: wrestlerInfo.high_school,
      total_matches: seasonSummary.total_matches,
      wins: seasonSummary.wins,
      losses: seasonSummary.losses,
      pins: seasonSummary.pins,
      tech_falls: seasonSummary.tech_falls,
      decisions: seasonSummary.decisions,
      major_decisions: seasonSummary.major_decisions,
      forfeits_won: seasonSummary.forfeits_won,
      pin_percentage: Number.parseFloat(seasonSummary.pin_percentage) || 0,
      tf_percentage: Number.parseFloat(seasonSummary.tf_percentage) || 0,
      finishing_percentage: Number.parseFloat(seasonSummary.finishing_percentage) || 0,
      matches: matches,
    }

    console.log("=== INSERTING MATCH RECORD ===")
    console.log("Match record to insert:", JSON.stringify(matchRecord, null, 2))

    // Insert the match record
    const { data: insertedMatch, error: insertError } = await supabase
      .from("matches")
      .insert(matchRecord)
      .select()
      .single()

    if (insertError) {
      console.error("❌ INSERT ERROR:", insertError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to insert match data",
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        },
        { status: 500 },
      )
    }

    console.log("✅ SUCCESS: Match inserted with ID:", insertedMatch.id)

    return NextResponse.json({
      success: true,
      message: "Match data uploaded successfully",
      count: matches.length,
      athleteName: athlete.name,
      season: wrestlerInfo.season,
      wrestlerId: wrestlerId,
      data: {
        matchId: insertedMatch.id,
        athleteId: athleteId,
        wrestlerId: wrestlerId,
        season: wrestlerInfo.season,
        totalMatches: seasonSummary.total_matches,
      },
    })
  } catch (error) {
    console.error("❌ CATCH ERROR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
