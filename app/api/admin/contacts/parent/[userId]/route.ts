import { createAdminClient } from "@/lib/supabase/admin"
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
    const admin = createAdminClient()

    // Fetch user profile
    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    // Fetch linked athletes - two separate queries to avoid join issues
    const { data: links } = await admin
      .from("parent_athlete_links")
      .select("athlete_id")
      .eq("user_id", userId)

    let linkedAthletes: any[] = []
    if (links && links.length > 0) {
      const athleteIds = links.map((l) => l.athlete_id).filter(Boolean)
      
      if (athleteIds.length > 0) {
        const { data: athletes } = await admin
          .from("athletes")
          .select("id, name, photourl, graduationyear, weightclass, highschool")
          .in("id", athleteIds)

        linkedAthletes = (athletes || []).map((a) => ({
          id: a.id,
          name: a.name,
          photourl: a.photourl,
          graduationyear: a.graduationyear,
          weightclass: a.weightclass,
          highschool: a.highschool,
        }))
      }
    }

    // Fetch auth info
    let authInfo = null
    let loginHistory: { timestamp: string; method: string | null; ip: string | null; userAgent: string | null }[] = []

    const { data: authData } = await admin.auth.admin.getUserById(userId)

    if (authData?.user) {
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

    // Get user analytics for login history
    const { data: analytics } = await admin
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

    return NextResponse.json({
      success: true,
      profile,
      linkedAthletes,
      auth: authInfo,
      loginHistory: loginHistory.slice(0, 50),
    })
  } catch (error: any) {
    console.error("[admin/contacts/parent] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
