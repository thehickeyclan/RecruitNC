import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Manually link a placement to an athlete profile
 */
export async function POST(request: NextRequest) {
  try {
    const { placementId, athleteId } = await request.json()

    if (!placementId || !athleteId) {
      return NextResponse.json({ error: "placementId and athleteId are required" }, { status: 400 })
    }

    // Verify athlete exists
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id, name")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Update placement
    const { data, error } = await supabase
      .from("nhsca_placements")
      .update({
        athlete_id: athleteId,
        match_status: "manually_matched",
        match_confidence: 1.0,
        match_method: "manual",
        matched_at: new Date().toISOString(),
      })
      .eq("id", placementId)
      .select()
      .single()

    if (error) {
      console.error("Error matching placement:", error)
      return NextResponse.json({ error: "Failed to match placement", details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      placement: data,
      athlete: { id: athlete.id, name: athlete.name },
      message: `Successfully matched placement to ${athlete.name}`,
    })
  } catch (error: any) {
    console.error("Manual match error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

