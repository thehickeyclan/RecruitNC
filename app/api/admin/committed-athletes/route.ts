import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

function isCommittedStatus(status?: string | null) {
  if (!status) return false
  const COMMITTED_STATUSES = ["committed", "signed", "college athlete"]
  const normalized = status.trim().toLowerCase()
  return COMMITTED_STATUSES.includes(normalized)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Get all committed athletes
    const { data: athletes, error: athletesError } = await adminSupabase
      .from("athletes")
      .select("id, name, college, recruiting_status, graduationyear")
      .or("recruiting_status.eq.Committed,recruiting_status.eq.Signed,recruiting_status.eq.College Athlete")
      .order("name", { ascending: true })

    if (athletesError) {
      return NextResponse.json({ error: "Failed to fetch athletes", details: athletesError.message }, { status: 500 })
    }

    // Get all star entries to check which athletes are in portals
    const athleteIds = athletes?.map(a => a.id) || []
    const { data: stars } = await adminSupabase
      .from("college_coach_stars")
      .select("athlete_id, pipeline_stage")
      .in("athlete_id", athleteIds)
      .in("pipeline_stage", ["Committed", "Signed", "committed", "signed"])

    const starredAthleteIds = new Set(stars?.map(s => s.athlete_id) || [])

    // Enrich athletes with portal status
    const enrichedAthletes = (athletes || []).map(athlete => ({
      ...athlete,
      in_portal: starredAthleteIds.has(athlete.id),
    }))

    return NextResponse.json({
      athletes: enrichedAthletes,
      total: enrichedAthletes.length,
      in_portal: enrichedAthletes.filter(a => a.in_portal).length,
      not_in_portal: enrichedAthletes.filter(a => !a.in_portal).length,
    })
  } catch (error: any) {
    console.error("[committed-athletes] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

