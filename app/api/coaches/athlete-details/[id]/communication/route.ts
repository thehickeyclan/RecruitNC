import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const athleteId = params.id
    const communication = await request.json()

    console.log("[v0] Adding communication for athlete:", athleteId)
    console.log("[v0] Communication data:", communication)

    // Get current communication log
    const { data: currentStar, error: fetchError } = await supabase
      .from("college_coach_stars")
      .select("communication_log")
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", user.id)
      .single()

    if (fetchError) {
      console.error("[v0] Error fetching current star:", fetchError)
      return NextResponse.json({ error: "Failed to fetch current data" }, { status: 500 })
    }

    // Append new communication to log
    const currentLog = currentStar.communication_log || []
    const newLog = [
      ...currentLog,
      {
        ...communication,
        timestamp: new Date().toISOString(),
        logged_by: user.email,
      },
    ]

    // Update the record
    const { data, error } = await supabase
      .from("college_coach_stars")
      .update({
        communication_log: newLog,
      })
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", user.id)
      .select()

    if (error) {
      console.error("[v0] Error updating communication log:", error)
      return NextResponse.json({ error: "Failed to log communication" }, { status: 500 })
    }

    console.log("[v0] Communication logged successfully")

    return NextResponse.json({
      success: true,
      message: "Communication logged successfully",
    })
  } catch (error) {
    console.error("Communication log API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

