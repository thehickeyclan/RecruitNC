import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getCachedAdminCheck } from "@/lib/cached-auth-check"

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const authCheck = await getCachedAdminCheck()
    if (authCheck.response) return authCheck.response
    if (!authCheck.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { userId } = await params
    const supabase = await createClient()

    // Fetch coach profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("[admin/contacts/coach] Profile error:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 })
    }

    // Fetch starred athletes with athlete details
    let starredAthletes: any[] = []
    try {
      const { data: stars } = await supabase
        .from("college_coach_stars")
        .select(`
          id,
          athlete_id,
          starred_at,
          pipeline_stage,
          star_rating,
          last_contacted,
          athletes (
            id,
            name,
            photourl,
            graduationyear,
            weightclass,
            highschool
          )
        `)
        .eq("coach_user_id", userId)
        .order("starred_at", { ascending: false })
        .limit(50)

      starredAthletes = (stars || []).map((star: any) => ({
        id: star.id,
        athlete_id: star.athlete_id,
        athlete_name: star.athletes?.name || null,
        athlete_photo: star.athletes?.photourl || null,
        athlete_grad_year: star.athletes?.graduationyear || null,
        athlete_weight: star.athletes?.weightclass || null,
        athlete_school: star.athletes?.highschool || null,
        starred_at: star.starred_at,
        pipeline_stage: star.pipeline_stage,
        star_rating: star.star_rating,
        last_contacted: star.last_contacted,
      }))
    } catch (e) {
      console.error("[admin/contacts/coach] Stars error:", e)
    }

    // Fetch recruiting activities
    let activities: any[] = []
    try {
      const { data: acts } = await supabase
        .from("recruiting_actions")
        .select(`
          id,
          action_type,
          description,
          athlete_id,
          created_at,
          athletes (name)
        `)
        .eq("coach_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100)

      activities = (acts || []).map((a: any) => ({
        id: a.id,
        action_type: a.action_type,
        description: a.description,
        athlete_id: a.athlete_id,
        athlete_name: a.athletes?.name || null,
        created_at: a.created_at,
      }))
    } catch (e) {
      console.error("[admin/contacts/coach] Activities error:", e)
    }

    // Fetch auth info using service client
    let authInfo = null
    let loginHistory: { timestamp: string; method: string | null; ip: string | null; userAgent: string | null }[] = []

    try {
      const admin = await createServiceClient()
      const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId)

      if (!authError && authData?.user) {
        const u = authData.user
        authInfo = {
          id: u.id,
          email: u.email ?? null,
          phone: u.phone ?? null,
          createdAt: u.created_at ?? null,
          lastSignInAt: u.last_sign_in_at ?? null,
          confirmedAt: u.confirmed_at ?? null,
          isAnonymous: !!u.is_anonymous,
        }

        // Build login history
        if (profile.last_login_at) {
          loginHistory.push({
            timestamp: profile.last_login_at,
            method: "login",
            ip: null,
            userAgent: null,
          })
        }

        if (u.last_sign_in_at && u.last_sign_in_at !== profile.last_login_at) {
          loginHistory.push({
            timestamp: u.last_sign_in_at,
            method: "auth_sign_in",
            ip: null,
            userAgent: null,
          })
        }

        if (u.created_at) {
          loginHistory.push({
            timestamp: u.created_at,
            method: "account_created",
            ip: null,
            userAgent: null,
          })
        }

        loginHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
    } catch (e) {
      console.error("[admin/contacts/coach] Auth lookup error:", e)
    }

    // Try to get user analytics for more login history
    try {
      const { data: analytics } = await supabase
        .from("user_analytics")
        .select("created_at, event_type, user_agent, ip_address")
        .eq("user_id", userId)
        .in("event_type", ["login", "signup", "page_view"])
        .order("created_at", { ascending: false })
        .limit(50)

      if (analytics && analytics.length > 0) {
        for (const entry of analytics) {
          const exists = loginHistory.some(
            (h) => Math.abs(new Date(h.timestamp).getTime() - new Date(entry.created_at).getTime()) < 60000
          )
          if (!exists) {
            loginHistory.push({
              timestamp: entry.created_at,
              method: entry.event_type,
              ip: entry.ip_address,
              userAgent: entry.user_agent,
            })
          }
        }
        loginHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
    } catch (e) {
      // Analytics table may not exist
    }

    return NextResponse.json({
      success: true,
      profile,
      starredAthletes,
      activities,
      auth: authInfo,
      loginHistory: loginHistory.slice(0, 50),
    })
  } catch (error: any) {
    console.error("[admin/contacts/coach] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
