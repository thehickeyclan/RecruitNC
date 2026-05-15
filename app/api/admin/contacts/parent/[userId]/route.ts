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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("[admin/contacts/parent] Profile error:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    // Fetch linked athletes
    const { data: links } = await supabase
      .from("parent_athlete_links")
      .select("athlete_id, athletes(id, name, photourl, graduationyear, weightclass, highschool)")
      .eq("user_id", userId)

    const linkedAthletes = (links || [])
      .map((link: any) => link.athletes)
      .filter(Boolean)
      .map((a: any) => ({
        id: a.id,
        name: a.name,
        photourl: a.photourl,
        graduationyear: a.graduationyear,
        weightclass: a.weightclass,
        highschool: a.highschool,
      }))

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

        // Try to get login history from audit log if available
        // The auth.audit_log_entries may contain login history
        // For now, we'll use the last_login_at from user_profiles as the primary source
        // and create a synthetic entry
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

        // Sort by timestamp descending
        loginHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
    } catch (e) {
      console.error("[admin/contacts/parent] Auth lookup error:", e)
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
          // Avoid duplicates
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
        // Re-sort after adding analytics
        loginHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }
    } catch (e) {
      // Analytics table may not exist, that's ok
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
