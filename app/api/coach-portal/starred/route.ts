import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Check if user is a verified coach
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("verified_coach, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.verified_coach && profile?.role !== "coach") {
      return NextResponse.json({ error: "Verified coach access required" }, { status: 403 })
    }

    // Get starred prospects for this coach
    const { data: starredProspects, error } = await supabase
      .from("college_coach_stars")
      .select(`
        starred_at,
        notes,
        interest_level,
        athletes!inner (
          id,
          name,
          firstName,
          lastName,
          graduationyear,
          gender,
          weightclass,
          highschool,
          wrestlingClub,
          photourl,
          achievements,
          prospect_ranking,
          recruiting_status,
          academic_gpa,
          academic_sat,
          academic_act,
          academic_summary,
          location,
          is_prospect
        )
      `)
      .eq("coach_user_id", user.id)
      .order("starred_at", { ascending: false })

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to fetch starred prospects" }, { status: 500 })
    }

    const prospects = (starredProspects || []).map((star) => ({
      ...star.athletes,
      is_starred: true,
      star_notes: star.notes,
      interest_level: star.interest_level,
      starred_at: star.starred_at,
    }))

    return NextResponse.json({
      success: true,
      prospects,
    })
  } catch (error) {
    console.error("Coach starred prospects API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
