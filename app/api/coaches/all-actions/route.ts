import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the coach's profile to find their school_id
  const { data: profile } = await supabase.from("user_profiles").select("school_id").eq("user_id", user.id).single()

  if (!profile?.school_id) {
    return NextResponse.json({ actions: [] })
  }

  // Get all coaches at the same school
  const { data: schoolCoaches } = await supabase
    .from("user_profiles")
    .select("user_id, full_name")
    .eq("school_id", profile.school_id)

  const coachUserIds = schoolCoaches?.map((c) => c.user_id) || []

  // Get all actions from coaches at this school with athlete info
  const { data: actions, error } = await supabase
    .from("recruiting_actions")
    .select(
      `
      *,
      athletes:athlete_id (
        name,
        photourl
      )
    `,
    )
    .in("coach_user_id", coachUserIds)
    .order("follow_up_date", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("Error fetching actions:", error)
    return NextResponse.json({ error: "Failed to fetch actions" }, { status: 500 })
  }

  // Map actions with athlete and coach info
  const mappedActions = actions?.map((action: any) => {
    const coach = schoolCoaches?.find((c) => c.user_id === action.coach_user_id)
    return {
      id: action.id,
      action_type: action.action_type,
      action_date: action.action_date,
      follow_up_date: action.follow_up_date,
      description: action.description,
      outcome: action.outcome,
      athlete_id: action.athlete_id,
      coach_user_id: action.coach_user_id,
      athlete_name: action.athletes?.name || "Unknown Athlete",
      athlete_photo: action.athletes?.photourl || "",
      coach_name: coach?.full_name || "Unknown Coach",
    }
  })

  return NextResponse.json({ actions: mappedActions || [] })
}
