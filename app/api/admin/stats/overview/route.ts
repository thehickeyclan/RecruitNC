import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get total athletes
    const { count: totalAthletes } = await supabase.from("athletes").select("*", { count: "exact", head: true })

    // Get total users
    const { count: totalUsers } = await supabase.from("user_profiles").select("*", { count: "exact", head: true })

    // Get pending submissions (if table exists)
    let pendingSubmissions = 0
    try {
      const { count } = await supabase
        .from("commitment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingSubmissions = count || 0
    } catch (error) {
      // Table might not exist yet
      console.log("Commitment submissions table not found")
    }

    // Get recent activity (users created in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentActivity } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString())

    return NextResponse.json({
      totalAthletes: totalAthletes || 0,
      totalUsers: totalUsers || 0,
      pendingSubmissions,
      recentActivity: recentActivity || 0,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch admin statistics" }, { status: 500 })
  }
}
