import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const admin = createAdminClient()

    // Get total athletes/prospects (service role bypasses RLS, ensures accurate counts)
    const { count: totalAthletes } = await admin.from("athletes").select("*", { count: "exact", head: true })

    // Get prospects (is_prospect = true OR recruiting_status not committed/signed)
    const { count: totalProspects } = await admin
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .or("is_prospect.eq.true,recruiting_status.in.(Uncommitted,uncommitted)")

    // Get commits (recruiting_status = Committed/Signed/College Athlete)
    const { count: totalCommits } = await admin
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .neq("college", "")
      .in("recruiting_status", ["Committed", "Signed", "College Athlete", "committed", "signed"])

    // Platform users = auth sign-ups (matches Users Dashboard count)
    let totalUsers = 0
    let page = 1
    let hasMore = true
    while (hasMore) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      totalUsers += data.users?.length ?? 0
      hasMore = (data.users?.length ?? 0) >= 1000
      if (hasMore) page++
    }

    // Get coaches (users with school_id) from user_profiles
    const { count: totalCoaches } = await admin
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .not("school_id", "is", null)

    // Get pending submissions across all types
    let pendingSubmissions = 0

    // Commitment submissions
    try {
      const { count } = await admin
        .from("commitment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingSubmissions += count || 0
    } catch (error) {
      console.log("Commitment submissions table check skipped")
    }

    // Profile submissions
    try {
      const { count } = await admin
        .from("athlete_profile_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingSubmissions += count || 0
    } catch (error) {
      console.log("Profile submissions table check skipped")
    }

    // Edit requests
    try {
      const { count } = await admin
        .from("profile_edit_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingSubmissions += count || 0
    } catch (error) {
      console.log("Edit requests table check skipped")
    }

    return NextResponse.json({
      totalAthletes: totalAthletes || 0,
      totalProspects: totalProspects || 0,
      totalCommits: totalCommits || 0,
      totalUsers: totalUsers || 0,
      totalCoaches: totalCoaches || 0,
      pendingSubmissions,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch admin statistics" }, { status: 500 })
  }
}
