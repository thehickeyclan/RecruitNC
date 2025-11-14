import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Card analytics API called")
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Card analytics: Not authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[v0] Card analytics: User authenticated:", user.id)

    // Get card view analytics without the join first
    const { data: cardViews, error: cardViewsError } = await supabase
      .from("user_analytics")
      .select("*")
      .in("event_type", ["card_view", "card_click", "profile_view"])
      .order("created_at", { ascending: false })
      .limit(100)

    if (cardViewsError) {
      console.error("[v0] Error fetching card views:", cardViewsError)
      return NextResponse.json({ error: "Failed to fetch analytics data", details: cardViewsError }, { status: 500 })
    }

    console.log("[v0] Card analytics: Fetched", cardViews?.length || 0, "card views")

    // Get unique user IDs from the card views
    const userIds = [...new Set(cardViews?.map((v) => v.user_id).filter(Boolean) || [])]

    // Fetch user profiles separately
    let userProfiles: any = {}
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, profile_type, email, first_name, last_name")
        .in("user_id", userIds)

      if (!profilesError && profiles) {
        userProfiles = profiles.reduce((acc: any, profile: any) => {
          acc[profile.user_id] = profile
          return acc
        }, {})
      }
    }

    // Merge user profiles with card views
    const enrichedCardViews = cardViews?.map((view) => ({
      ...view,
      user_profiles: view.user_id ? userProfiles[view.user_id] : null,
    }))

    // Calculate athlete stats
    let athleteStats: any = {}
    if (cardViews) {
      athleteStats = cardViews.reduce((acc: any, record: any) => {
        if (record.event_data?.athlete_id) {
          const athleteId = record.event_data.athlete_id
          const athleteName = record.event_data.athlete_name || "Unknown"

          if (!acc[athleteId]) {
            acc[athleteId] = {
              athlete_id: athleteId,
              athlete_name: athleteName,
              total_views: 0,
              profile_types: {},
            }
          }

          acc[athleteId].total_views++

          const profileType =
            record.event_data.profile_type ||
            (record.user_id && userProfiles[record.user_id]?.profile_type) ||
            "anonymous"
          acc[athleteId].profile_types[profileType] = (acc[athleteId].profile_types[profileType] || 0) + 1
        }
        return acc
      }, {})
    }

    // Convert to array and sort by views
    const topAthletes = Object.values(athleteStats)
      .sort((a: any, b: any) => b.total_views - a.total_views)
      .slice(0, 20)

    // Get profile type breakdown
    const profileTypeStats: any = {}
    if (enrichedCardViews) {
      enrichedCardViews.forEach((view: any) => {
        const profileType = view.event_data?.profile_type || view.user_profiles?.profile_type || "anonymous"
        profileTypeStats[profileType] = (profileTypeStats[profileType] || 0) + 1
      })
    }

    console.log("[v0] Card analytics: Returning data with", topAthletes.length, "top athletes")

    return NextResponse.json({
      cardViews: enrichedCardViews || [],
      topAthletes,
      profileTypeStats,
      totalViews: cardViews?.length || 0,
    })
  } catch (error: any) {
    console.error("[v0] Card analytics API error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
