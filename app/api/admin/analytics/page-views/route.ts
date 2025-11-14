import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user has admin privileges
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (profileError) {
      console.error("Profile lookup error:", profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 403 })
    }

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7")

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get page views without the problematic join
    const { data: pageViews, error } = await supabase
      .from("user_analytics")
      .select(`
        id,
        user_id,
        event_type,
        page_url,
        referrer,
        user_agent,
        ip_address,
        created_at
      `)
      .eq("event_type", "page_view")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000)

    if (error) {
      console.error("Error fetching analytics:", error)
      return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
    }

    // Get unique user IDs from the page views
    const userIds = [...new Set(pageViews?.map((view) => view.user_id).filter(Boolean))] as string[]

    // Fetch user profiles separately if we have user IDs
    let userProfiles: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, first_name, last_name, email")
        .in("user_id", userIds)

      if (profiles) {
        userProfiles = profiles.reduce(
          (acc, profile) => {
            acc[profile.user_id] = profile
            return acc
          },
          {} as Record<string, any>,
        )
      }
    }

    // Combine the data
    const enrichedPageViews =
      pageViews?.map((view) => ({
        ...view,
        user_profiles: view.user_id ? userProfiles[view.user_id] : null,
      })) || []

    // Calculate summary stats
    const pageStats: Record<string, { views: number; unique_users: Set<string> }> = {}

    enrichedPageViews.forEach((view) => {
      const page = view.page_url
      if (!pageStats[page]) {
        pageStats[page] = { views: 0, unique_users: new Set() }
      }
      pageStats[page].views++
      if (view.user_id) {
        pageStats[page].unique_users.add(view.user_id)
      }
    })

    const summary = Object.entries(pageStats).map(([page_url, stats]) => ({
      page_url,
      views: stats.views,
      unique_users: stats.unique_users.size,
    }))

    return NextResponse.json({
      data: enrichedPageViews,
      summary,
      total_views: enrichedPageViews.length,
      date_range: {
        start: startDate.toISOString(),
        days,
      },
    })
  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
