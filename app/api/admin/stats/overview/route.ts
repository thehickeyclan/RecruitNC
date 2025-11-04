import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get total athletes/prospects
    const { count: totalAthletes } = await supabase.from("athletes").select("*", { count: "exact", head: true })

    // Get prospects (is_prospect = true OR recruiting_status not committed/signed)
    const { count: totalProspects } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .or("is_prospect.eq.true,recruiting_status.in.(Uncommitted,uncommitted)")

    // Get commits (recruiting_status = Committed/Signed/College Athlete)
    const { count: totalCommits } = await supabase
      .from("athletes")
      .select("*", { count: "exact", head: true })
      .not("college", "is", null)
      .neq("college", "")
      .in("recruiting_status", ["Committed", "Signed", "College Athlete", "committed", "signed"])

    // Get total users on platform
    const { count: totalUsers } = await supabase.from("user_profiles").select("*", { count: "exact", head: true })

    // Get coaches (users with school_id or coach role)
    const { count: totalCoaches } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .not("school_id", "is", null")

    // Get pending submissions across all types
    let pendingSubmissions = 0
    
    // Commitment submissions
    try {
      const { count } = await supabase
        .from("commitment_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingSubmissions += count || 0
    } catch (error) {
      console.log("Commitment submissions table check skipped")
    }

    // Profile submissions
    try {
      const { count } = await supabase
        .from("athlete_profile_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
      pendingSubmissions += count || 0
    } catch (error) {
      console.log("Profile submissions table check skipped")
    }

    // Edit requests
    try {
      const { count } = await supabase
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
