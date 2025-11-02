import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get total coaches
    const { count: totalCoaches } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "coach")

    // Get pending approvals
    const { count: pendingApprovals } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "coach")
      .eq("verified_coach", false)

    // Get verified coaches
    const { count: verifiedCoaches } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "coach")
      .eq("verified_coach", true)

    // Get active recruiters (coaches with starred athletes in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activeCoaches } = await supabase
      .from("college_coach_stars")
      .select("coach_id")
      .gte("created_at", thirtyDaysAgo.toISOString())

    const activeRecruiters = new Set(activeCoaches?.map((c) => c.coach_id) || []).size

    return NextResponse.json({
      totalCoaches: totalCoaches || 0,
      pendingApprovals: pendingApprovals || 0,
      verifiedCoaches: verifiedCoaches || 0,
      activeRecruiters,
    })
  } catch (error) {
    console.error("Error fetching coach stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
