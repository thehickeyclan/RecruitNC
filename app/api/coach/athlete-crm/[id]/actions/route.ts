import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const athleteId = params.id
    const body = await request.json()

    const { error } = await supabase.from("recruiting_actions").insert({
      coach_user_id: user.id,
      athlete_id: athleteId,
      action_type: body.action_type,
      action_date: body.action_date,
      description: body.description,
      outcome: body.outcome || null,
      follow_up_date: body.follow_up_date || null,
    })

    if (error) {
      return NextResponse.json({ error: "Failed to add action" }, { status: 500 })
    }

    // Update last_contacted in college_coach_stars
    await supabase
      .from("college_coach_stars")
      .update({ last_contacted: body.action_date })
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
