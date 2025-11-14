import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    // 1) Verify user and admin access with regular server client (anon key + cookies)
    const supabase = createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check admin flag in public.user_profiles
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (profileError) {
      console.error("Admin check error:", profileError)
      return NextResponse.json({ error: "Failed to verify admin status" }, { status: 500 })
    }

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // 2) Use service role client to read from auth.users for accurate signup/login stats
    const admin = createAdminClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const oneMonthAgo = new Date(now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // Total users
    const { count: totalUsers, error: countError } = await admin
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true })

    if (countError) {
      console.error("Error counting auth.users:", countError)
      return NextResponse.json({ error: "Failed to count users" }, { status: 500 })
    }

    // Active users: last_sign_in_at in last 30 days
    const { count: activeUsers, error: activeError } = await admin
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("last_sign_in_at", thirtyDaysAgo.toISOString())

    if (activeError) {
      console.error("Error counting active users:", activeError)
      return NextResponse.json({ error: "Failed to count active users" }, { status: 500 })
    }

    // New users today
    const { count: newUsersToday, error: todayError } = await admin
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("created_at", today.toISOString())

    if (todayError) {
      console.error("Error counting new users today:", todayError)
      return NextResponse.json({ error: "Failed to count new users today" }, { status: 500 })
    }

    // New users this week
    const { count: newUsersThisWeek, error: weekError } = await admin
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("created_at", oneWeekAgo.toISOString())

    if (weekError) {
      console.error("Error counting new users this week:", weekError)
      return NextResponse.json({ error: "Failed to count new users this week" }, { status: 500 })
    }

    // New users this month
    const { count: newUsersThisMonth, error: monthError } = await admin
      .schema("auth")
      .from("users")
      .select("*", { count: "exact", head: true })
      .gt("created_at", oneMonthAgo.toISOString())

    if (monthError) {
      console.error("Error counting new users this month:", monthError)
      return NextResponse.json({ error: "Failed to count new users this month" }, { status: 500 })
    }

    // Most recent login
    const { data: recent, error: recentError } = await admin
      .schema("auth")
      .from("users")
      .select("last_sign_in_at")
      .not("last_sign_in_at", "is", null)
      .order("last_sign_in_at", { ascending: false })
      .limit(1)

    if (recentError) {
      console.error("Error fetching last login:", recentError)
      return NextResponse.json({ error: "Failed to fetch last login" }, { status: 500 })
    }

    const lastLoginTime = Array.isArray(recent) && recent.length > 0 ? recent[0].last_sign_in_at : null

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      newUsersToday: newUsersToday || 0,
      newUsersThisWeek: newUsersThisWeek || 0,
      newUsersThisMonth: newUsersThisMonth || 0,
      lastLoginTime,
    })
  } catch (error) {
    console.error("Error in users stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
