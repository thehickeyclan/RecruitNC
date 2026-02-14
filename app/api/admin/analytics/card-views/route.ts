import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Supabase/PostgREST caps at 1000 rows per query. We paginate to fetch all for aggregation.
const PAGE_SIZE = 1000
const RECENT_DISPLAY_LIMIT = 1000

function getFromDateForRange(range: string | null): string | null {
  const now = new Date()
  if (!range || range === "all") return null
  let from: Date
  if (range === "today") {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  } else if (range === "last7") {
    from = new Date(now)
    from.setDate(from.getDate() - 7)
  } else if (range === "last30") {
    from = new Date(now)
    from.setDate(from.getDate() - 30)
  } else if (range === "last90") {
    from = new Date(now)
    from.setDate(from.getDate() - 90)
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

    const COACH_PROFILE_TYPES = new Set([
      "college_coach", "coach", "admin", "college-coach", "hs-club-coach",
    ])

    // 1. Get total count (not capped by 1000) using count-only query
    let countQuery = supabase
      .from("user_analytics")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "profile_view")
    if (fromDate) {
      countQuery = countQuery.gte("created_at", fromDate)
    }
    const { count: totalViewsCount, error: countError } = await countQuery

    if (countError) {
      console.error("[v0] Profile-view count error:", countError)
    }
    const totalViews = totalViewsCount ?? 0

    // 2. Paginate through all profile_view events for aggregation (Supabase caps at 1000/query)
    const allEvents: any[] = []
    let offset = 0
    let hasMore = true
    while (hasMore) {
      let batchQuery = supabase
        .from("user_analytics")
        .select("id, event_data, event_type, user_id, created_at")
        .eq("event_type", "profile_view")
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (fromDate) {
        batchQuery = batchQuery.gte("created_at", fromDate)
      }
      const { data: batch, error: batchError } = await batchQuery

      if (batchError) {
        console.error("[v0] Profile-view batch fetch error:", batchError)
        break
      }
      if (!batch || batch.length === 0) break
      allEvents.push(...batch)
      if (batch.length < PAGE_SIZE) hasMore = false
      else offset += PAGE_SIZE
    }

    // 3. Fetch user profiles for all unique user_ids (needed for profile type stats across all events)
    const userIds = [...new Set(allEvents.map((v) => v.user_id).filter(Boolean))]
    let userProfiles: any = {}
    const PROFILE_BATCH = 500
    for (let i = 0; i < userIds.length; i += PROFILE_BATCH) {
      const batch = userIds.slice(i, i + PROFILE_BATCH)
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, profile_type, email, first_name, last_name")
        .in("user_id", batch)
      if (profiles) {
        for (const p of profiles) {
          userProfiles[p.user_id] = p
        }
      }
    }

    const enrichedCardViews = allEvents.slice(0, RECENT_DISPLAY_LIMIT).map((view) => ({
      ...view,
      user_profiles: view.user_id ? userProfiles[view.user_id] : null,
    }))

    // 4. Compute aggregations from all events (no 1000 cap)
    const athleteStats: any = {}
    const profileTypeStats: any = {}
    const clickCounts: Record<string, { name: string; count: number; lastViewed?: string }> = {}
    const coachClickCounts: Record<string, { name: string; count: number; lastViewed?: string }> = {}

    for (const record of allEvents) {
      const profileType =
        record.event_data?.profile_type ||
        (record.user_id && userProfiles[record.user_id]?.profile_type) ||
        "anonymous"
      profileTypeStats[profileType] = (profileTypeStats[profileType] || 0) + 1

      let ed = record.event_data as { athlete_id?: string; athlete_name?: string; profile_type?: string } | null
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
      const createdAt = record.created_at

      if (!athleteStats[id]) {
        athleteStats[id] = {
          athlete_id: id,
          athlete_name: name,
          total_views: 0,
          profile_types: {},
        }
      }
      athleteStats[id].total_views++
      athleteStats[id].profile_types[profileType] = (athleteStats[id].profile_types[profileType] || 0) + 1

      if (!clickCounts[id]) clickCounts[id] = { name, count: 0, lastViewed: createdAt || undefined }
      clickCounts[id].count++
      if (isCoach) {
        if (!coachClickCounts[id]) coachClickCounts[id] = { name, count: 0, lastViewed: createdAt || undefined }
        coachClickCounts[id].count++
      }
    }

    const topAthletes = Object.values(athleteStats)
      .sort((a: any, b: any) => b.total_views - a.total_views)
      .slice(0, 20)

    const profileClickRanking = Object.entries(clickCounts)
      .map(([athlete_id, { name: athlete_name, count: clicks, lastViewed }]) => ({ athlete_id, athlete_name, clicks, lastViewed }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50)

    const profileViewRankingCoaches = Object.entries(coachClickCounts)
      .map(([athlete_id, { name: athlete_name, count: clicks, lastViewed }]) => ({ athlete_id, athlete_name, clicks, lastViewed }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50)

    return NextResponse.json({
      cardViews: enrichedCardViews || [],
      topAthletes,
      profileClickRanking: profileClickRanking || [],
      profileViewRankingCoaches: profileViewRankingCoaches || [],
      profileTypeStats,
      totalViews,
      range: range || "all",
    })
  } catch (error: any) {
    console.error("[v0] Card analytics API error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
