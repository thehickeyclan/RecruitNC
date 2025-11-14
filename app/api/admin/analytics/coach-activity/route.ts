import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated and admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams
    const days = Number.parseInt(searchParams.get("days") || "30")
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all college coaches
    const { data: coaches, error: coachesError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("profile_type", "college-coach")
      .order("created_at", { ascending: false })

    if (coachesError) {
      console.error("Error fetching coaches:", coachesError)
      return NextResponse.json({ error: "Failed to fetch coaches" }, { status: 500 })
    }

    // Calculate stats
    const totalCoaches = coaches?.length || 0
    const pendingApproval = coaches?.filter((c) => !c.verified_coach).length || 0
    const approvedCoaches = coaches?.filter((c) => c.verified_coach).length || 0
    const rejectedCoaches = 0 // You can add a rejected status if needed

    // Get active coaches
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 7)
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)

    const activeToday =
      coaches?.filter((c) => {
        if (!c.last_login_at) return false
        const lastLogin = new Date(c.last_login_at)
        return lastLogin >= today
      }).length || 0

    const activeLast7Days =
      coaches?.filter((c) => {
        if (!c.last_login_at) return false
        const lastLogin = new Date(c.last_login_at)
        return lastLogin >= last7Days
      }).length || 0

    const activeLast30Days =
      coaches?.filter((c) => {
        if (!c.last_login_at) return false
        const lastLogin = new Date(c.last_login_at)
        return lastLogin >= last30Days
      }).length || 0

    // Get analytics data for college coaches
    const coachUserIds = coaches?.map((c) => c.user_id) || []

    const { data: analyticsData, error: analyticsError } = await supabase
      .from("user_analytics")
      .select("*")
      .in("user_id", coachUserIds)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })

    if (analyticsError) {
      console.error("Error fetching analytics:", analyticsError)
    }

    // Process coach activity
    const coachActivity =
      coaches?.map((coach) => {
        const coachAnalytics = analyticsData?.filter((a) => a.user_id === coach.user_id) || []

        const totalPageViews = coachAnalytics.length
        const profileViews = coachAnalytics.filter(
          (a) => a.event_type === "profile_view" || a.event_type === "card_view",
        )
        const totalProfileViews = profileViews.length

        // Get unique athletes viewed
        const athleteIds = new Set(profileViews.map((a) => a.event_data?.athlete_id).filter(Boolean))
        const uniqueAthletesViewed = athleteIds.size

        // Calculate average session duration (time between first and last page view in a session)
        // Group by sessions (views within 30 minutes of each other)
        const sessions: Date[][] = []
        let currentSession: Date[] = []

        coachAnalytics
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .forEach((analytics) => {
            const viewTime = new Date(analytics.created_at)
            if (currentSession.length === 0) {
              currentSession.push(viewTime)
            } else {
              const lastView = currentSession[currentSession.length - 1]
              const diffMinutes = (viewTime.getTime() - lastView.getTime()) / 60000
              if (diffMinutes <= 30) {
                currentSession.push(viewTime)
              } else {
                sessions.push([...currentSession])
                currentSession = [viewTime]
              }
            }
          })
        if (currentSession.length > 0) sessions.push(currentSession)

        const avgSessionDuration =
          sessions.length > 0
            ? sessions.reduce((sum, session) => {
                if (session.length < 2) return sum
                const duration = (session[session.length - 1].getTime() - session[0].getTime()) / 60000
                return sum + duration
              }, 0) / sessions.length
            : 0

        // Get most viewed page
        const pageCounts: Record<string, number> = {}
        coachAnalytics.forEach((a) => {
          if (a.page_url) {
            pageCounts[a.page_url] = (pageCounts[a.page_url] || 0) + 1
          }
        })
        const mostViewedPage = Object.entries(pageCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || ""

        const lastActivity = coachAnalytics[0]?.created_at || coach.last_login_at

        return {
          user_id: coach.user_id,
          email: coach.email,
          full_name: coach.full_name || `${coach.first_name || ""} ${coach.last_name || ""}`.trim(),
          institution: coach.institution || "",
          coaching_position: coach.coaching_position || "",
          verified_coach: coach.verified_coach || false,
          created_at: coach.created_at,
          last_login_at: coach.last_login_at,
          total_page_views: totalPageViews,
          total_profile_views: totalProfileViews,
          unique_athletes_viewed: uniqueAthletesViewed,
          avg_session_duration: avgSessionDuration,
          most_viewed_page: mostViewedPage,
          last_activity: lastActivity,
        }
      }) || []

    // Sort by last activity
    coachActivity.sort((a, b) => {
      const aTime = new Date(a.last_activity || a.created_at).getTime()
      const bTime = new Date(b.last_activity || b.created_at).getTime()
      return bTime - aTime
    })

    // Get page access stats
    const pageAccessMap: Record<string, { count: number; coaches: Set<string> }> = {}
    analyticsData?.forEach((a) => {
      if (a.page_url && a.user_id) {
        if (!pageAccessMap[a.page_url]) {
          pageAccessMap[a.page_url] = { count: 0, coaches: new Set() }
        }
        pageAccessMap[a.page_url].count++
        pageAccessMap[a.page_url].coaches.add(a.user_id)
      }
    })

    const pageAccess = Object.entries(pageAccessMap)
      .map(([page_url, data]) => ({
        page_url,
        view_count: data.count,
        unique_coaches: data.coaches.size,
      }))
      .sort((a, b) => b.view_count - a.view_count)

    // Get profile view stats
    const profileViewMap: Record<string, { count: number; coaches: Set<string>; name: string; lastViewed: string }> = {}
    analyticsData
      ?.filter((a) => a.event_type === "profile_view" || a.event_type === "card_view")
      .forEach((a) => {
        const athleteId = a.event_data?.athlete_id
        const athleteName = a.event_data?.athlete_name || "Unknown Athlete"
        if (athleteId && a.user_id) {
          if (!profileViewMap[athleteId]) {
            profileViewMap[athleteId] = { count: 0, coaches: new Set(), name: athleteName, lastViewed: a.created_at }
          }
          profileViewMap[athleteId].count++
          profileViewMap[athleteId].coaches.add(a.user_id)
          if (new Date(a.created_at) > new Date(profileViewMap[athleteId].lastViewed)) {
            profileViewMap[athleteId].lastViewed = a.created_at
          }
        }
      })

    const profileViews = Object.entries(profileViewMap)
      .map(([athlete_id, data]) => ({
        athlete_id,
        athlete_name: data.name,
        view_count: data.count,
        unique_coaches: data.coaches.size,
        last_viewed: data.lastViewed,
      }))
      .sort((a, b) => b.view_count - a.view_count)

    return NextResponse.json({
      success: true,
      stats: {
        totalCoaches,
        pendingApproval,
        approvedCoaches,
        rejectedCoaches,
        activeToday,
        activeLast7Days,
        activeLast30Days,
      },
      coachActivity,
      pageAccess,
      profileViews,
    })
  } catch (error: any) {
    console.error("Coach analytics error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
