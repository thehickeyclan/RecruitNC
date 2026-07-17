import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { classifyViewer } from "@/lib/viewer-role"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { athleteId, athleteName, eventType = "card_view" } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Get user info (optional - can track anonymous users too)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let userProfile = null
    if (user) {
      // `role` and `verified_coach` are what's actually maintained. profile_type is stale —
      // most college coaches carry profile_type "fan" — so it must not decide who's a coach.
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("profile_type, role, verified_coach")
        .eq("user_id", user.id)
        .single()

      userProfile = profile
    }

    const viewer = classifyViewer(user ? userProfile : null)

    // Track the card view event
    const { error: trackingError } = await supabase.from("user_analytics").insert({
      user_id: user?.id || null,
      event_type: eventType,
      page_url: `/athletes/${athleteId}`,
      user_agent: request.headers.get("user-agent"),
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      event_data: {
        athlete_id: athleteId,
        athlete_name: athleteName,
        // Kept so the existing admin card-analytics page keeps reading; not a coach signal.
        profile_type: userProfile?.profile_type || "anonymous",
        // Denormalized at write time so a view stays classified as it was, even if the
        // viewer's role changes later. See scripts/backfill-profile-view-roles.sql for history.
        viewer_role: viewer.role,
        viewer_kind: viewer.kind,
        is_coach: viewer.isCoach,
        is_college_coach: viewer.isCollegeCoach,
        verified_coach: viewer.verifiedCoach,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    })

    if (trackingError) {
      console.error("Error tracking card view:", trackingError)
      // Don't fail the request if tracking fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Card tracking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
