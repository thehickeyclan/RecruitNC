import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check admin
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // 1. Get auth data (last sign in, created at)
    const { data: authData } = await admin.auth.admin.getUserById(userId)

    // 2. Get page views from user_analytics (last 100)
    const { data: pageViews, error: pvError } = await admin
      .from("user_analytics")
      .select("id, page_url, created_at, event_type, referrer, user_agent, ip_address")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)

    // 3. Get login sessions - group page views by day/session
    const sessions: { date: string; pageCount: number; firstPage: string; lastActivity: string; userAgent?: string }[] = []
    
    if (pageViews && pageViews.length > 0) {
      // Group by day
      const byDate = new Map<string, typeof pageViews>()
      for (const pv of pageViews) {
        const dateKey = pv.created_at?.split("T")[0] || "unknown"
        if (!byDate.has(dateKey)) byDate.set(dateKey, [])
        byDate.get(dateKey)!.push(pv)
      }

      for (const [date, views] of byDate) {
        const sorted = views.sort((a, b) => 
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        )
        sessions.push({
          date,
          pageCount: views.length,
          firstPage: sorted[0]?.page_url || "",
          lastActivity: sorted[sorted.length - 1]?.created_at || "",
          userAgent: sorted[0]?.user_agent || undefined,
        })
      }

      // Sort sessions by date descending
      sessions.sort((a, b) => b.date.localeCompare(a.date))
    }

    // 4. Get profile last login
    const { data: userProfile } = await admin
      .from("user_profiles")
      .select("last_login_at, last_login, created_at")
      .eq("user_id", userId)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        auth: {
          lastSignIn: authData?.user?.last_sign_in_at || null,
          createdAt: authData?.user?.created_at || null,
          email: authData?.user?.email || null,
          emailConfirmedAt: authData?.user?.email_confirmed_at || null,
        },
        profile: {
          lastLoginAt: userProfile?.last_login_at || userProfile?.last_login || null,
          createdAt: userProfile?.created_at || null,
        },
        sessions: sessions.slice(0, 30), // Last 30 sessions
        recentPages: (pageViews || []).slice(0, 50).map(pv => ({
          url: pv.page_url,
          timestamp: pv.created_at,
          referrer: pv.referrer,
        })),
        totalPageViews: pageViews?.length || 0,
      },
    })
  } catch (err) {
    console.error("[admin/contacts/activity] Error:", err)
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 })
  }
}
