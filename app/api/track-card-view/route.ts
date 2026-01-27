import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("profile_type, email")
        .eq("user_id", user.id)
        .single()

      userProfile = profile
    }

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
        profile_type: userProfile?.profile_type || "anonymous",
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
