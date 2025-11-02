import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { year, matches } = await request.json()

    if (!year || !matches || !Array.isArray(matches)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid data: year and matches array required",
        },
        { status: 400 },
      )
    }

    const supabase = createClient()

    // Get Liam Hickey's athlete ID
    const { data: athlete, error: athleteError } = await supabase
      .from("athletes")
      .select("id")
      .ilike("name", "%liam%hickey%")
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not find Liam Hickey in athletes table",
          details: athleteError,
        },
        { status: 404 },
      )
    }

    const athleteId = athlete.id

    // Prepare match data for insertion
    const matchData = matches.map((match: any) => ({
      athlete_id: athleteId,
      athlete_name: "Liam Hickey",
      opponent: match.opponent,
      opponent_school: match.opponent_school,
      date: match.date,
      tournament: match.tournament,
      weight_class: match.weight_class,
      result: match.result,
      decision_type: match.decision_type,
      time: match.time || null,
      period: match.period || null,
      score: match.score || null,
      year: year,
      created_at: new Date().toISOString(),
    }))

    // Insert matches
    const { data: insertedMatches, error: insertError } = await supabase.from("matches").insert(matchData).select()

    if (insertError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to insert matches",
          details: insertError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      count: insertedMatches.length,
      year: year,
      athlete_id: athleteId,
      details: insertedMatches,
    })
  } catch (error) {
    console.error("Error submitting matches:", error)
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
