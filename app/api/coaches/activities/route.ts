import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch activities with coach information
    const { data: activities, error } = await supabase
      .from("recruiting_actions")
      .select(
        `
        *,
        coach:user_profiles!recruiting_actions_coach_user_id_fkey(full_name, institution)
      `,
      )
      .eq("athlete_id", athleteId)
      .order("action_date", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, activities: activities || [] })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { athleteId, activityType, activityDate, scheduledDate, description, outcome } = body

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Insert activity
    const { data, error } = await supabase
      .from("recruiting_actions")
      .insert({
        athlete_id: athleteId,
        coach_user_id: user.id,
        action_type: activityType,
        action_date: activityDate || new Date().toISOString(),
        follow_up_date: scheduledDate || null,
        description: description || null,
        outcome: outcome || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, activity: data })
  } catch (error) {
    console.error("Error creating activity:", error)
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 })
  }
}
