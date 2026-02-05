import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// No practical cap; Supabase would default to 1000 without a limit.
const MAX_ROWS = 100000

function getFromDateForRange(range: string | null): string | null {
  const now = new Date()
  if (!range || range === "all") return null
  let from: Date
  if (range === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  } else if (range === "last30") {
    from = new Date(now)
    from.setDate(from.getDate() - 30)
  } else if (range === "year") {
    from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  } else {
    return null
  }
  return from.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: adminRow } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (!adminRow?.is_admin) {
      return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "all"
    const fromDate = getFromDateForRange(range)

    // Only count profile views (one per profile visit). Card clicks are no longer sent.
    let cardViewsQuery = supabase
      .from("user_analytics")
      .select("*")
      .eq("event_type", "profile_view")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS)
    if (fromDate) {
      cardViewsQuery = cardViewsQuery.gte("created_at", fromDate)
    }
    const { data: cardViews, error: cardViewsError } = await cardViewsQuery

    if (cardViewsError) {
      console.error("[v0] Profile-view analytics fetch error:", cardViewsError)
      return NextResponse.json({ error: "Failed to fetch analytics data", details: cardViewsError?.message }, { status: 500 })
    }

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

    // Profile-view stack ranking: one count per profile page view, with last_viewed
    let profileClickQuery = supabase
      .from("user_analytics")
      .select("event_data, created_at")
      .eq("event_type", "profile_view")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS)
    if (fromDate) {
      profileClickQuery = profileClickQuery.gte("created_at", fromDate)
    }
    const { data: profileClickEvents, error: profileClickError } = await profileClickQuery

    if (profileClickError) {
      console.error("[v0] Profile-view ranking query error:", profileClickError)
    }

    const COACH_PROFILE_TYPES = new Set([
      "college_coach", "coach", "admin", "college-coach", "hs-club-coach",
    ])

    const clickCounts: Record<string, { name: string; count: number; lastViewed?: string }> = {}
    const coachClickCounts: Record<string, { name: string; count: number; lastViewed?: string }> = {}
    if (profileClickEvents) {
      for (const row of profileClickEvents) {
        let ed = row.event_data as { athlete_id?: string; athlete_name?: string; profile_type?: string } | null
        if (typeof ed === "string") {
          try {
            ed = JSON.parse(ed) as { athlete_id?: string; athlete_name?: string; profile_type?: string }
          } catch {
            ed = null
          }
        }
        if (!ed?.athlete_id) continue
        const id = ed.athlete_id
        const name = ed.athlete_name || "Unknown"
        const isCoach = ed.profile_type != null && COACH_PROFILE_TYPES.has(ed.profile_type)
        const createdAt = (row as { created_at?: string }).created_at

        if (!clickCounts[id]) clickCounts[id] = { name, count: 0, lastViewed: createdAt || undefined }
        clickCounts[id].count++
        if (isCoach) {
          if (!coachClickCounts[id]) coachClickCounts[id] = { name, count: 0, lastViewed: createdAt || undefined }
          coachClickCounts[id].count++
        }
      }
    }
    const profileClickRanking = Object.entries(clickCounts)
      .map(([athlete_id, { name: athlete_name, count: clicks, lastViewed }]) => ({ athlete_id, athlete_name, clicks, lastViewed }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50)
    const profileViewRankingCoaches = Object.entries(coachClickCounts)
      .map(([athlete_id, { name: athlete_name, count: clicks, lastViewed }]) => ({ athlete_id, athlete_name, clicks, lastViewed }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50)

    // Get profile type breakdown
    const profileTypeStats: any = {}
    if (enrichedCardViews) {
      enrichedCardViews.forEach((view: any) => {
        const profileType = view.event_data?.profile_type || view.user_profiles?.profile_type || "anonymous"
        profileTypeStats[profileType] = (profileTypeStats[profileType] || 0) + 1
      })
    }

    return NextResponse.json({
      cardViews: enrichedCardViews || [],
      topAthletes,
      profileClickRanking: profileClickRanking || [],
      profileViewRankingCoaches: profileViewRankingCoaches || [],
      profileTypeStats,
      totalViews: cardViews?.length || 0,
      range: range || "all",
    })
  } catch (error: any) {
    console.error("[v0] Card analytics API error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
