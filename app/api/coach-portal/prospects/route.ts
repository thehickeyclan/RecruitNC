import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    let user = null
    let userError = null

    const authResult = await supabase.auth.getUser()
    user = authResult.data.user
    userError = authResult.error

    if (!user && request.headers.get("authorization")) {
      const token = request.headers.get("authorization")?.replace("Bearer ", "")
      if (token) {
        const {
          data: { user: tokenUser },
          error: tokenError,
        } = await supabase.auth.getUser(token)
        user = tokenUser
        userError = tokenError
      }
    }

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          debug: {
            hasUser: !!user,
            errorMessage: userError?.message || "Auth session missing!",
            hasCookies: !!request.headers.get("cookie"),
            hasAuthHeader: !!request.headers.get("authorization"),
          },
        },
        { status: 401 },
      )
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("verified_coach, role, school_id, is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile?.verified_coach && profile?.role !== "coach" && !profile?.is_admin) {
      return NextResponse.json({ error: "Verified coach access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get("schoolId")
    const graduationYear = searchParams.get("graduationYear")
    const gender = searchParams.get("gender")
    const minGpa = searchParams.get("minGpa")
    const minSat = searchParams.get("minSat")

    const targetSchoolId = schoolId || profile.school_id

    console.log("[v0] Prospects API - User:", user.email)
    console.log("[v0] Prospects API - Profile school_id:", profile.school_id)
    console.log("[v0] Prospects API - Target school_id:", targetSchoolId)

    if (!targetSchoolId) {
      return NextResponse.json({ error: "No school associated with this account" }, { status: 400 })
    }

    const { data: schoolCoaches } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", targetSchoolId)

    const coachUserIds = schoolCoaches?.map((c) => c.user_id) || []

    console.log("[v0] Prospects API - Coaches found at school:", coachUserIds.length)
    console.log("[v0] Prospects API - Coach user IDs:", coachUserIds)

    if (coachUserIds.length === 0) {
      return NextResponse.json({ success: true, prospects: [] })
    }

    const { data: starredData } = await supabase
      .from("college_coach_stars")
      .select("athlete_id, pipeline_stage, interest_level, starred_at, coach_user_id")
      .in("coach_user_id", coachUserIds)

    console.log("[v0] Prospects API - Starred athletes found:", starredData?.length || 0)
    console.log("[v0] Prospects API - Starred data:", starredData)

    if (!starredData || starredData.length === 0) {
      return NextResponse.json({ success: true, prospects: [] })
    }

    const starredAthleteIds = [...new Set(starredData.map((s) => s.athlete_id))]

    let query = supabase
      .from("athletes")
      .select(`
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
        phone,
        contactEmail,
        bio,
        careerRecord,
        super_32_2023_record,
        super_32_2023_placement,
        super_32_2024_record,
        super_32_2024_placement,
        super_32_2025_record,
        super_32_2025_placement,
        nhsca_2024_record,
        nhsca_2024_placement,
        nhsca_2025_record,
        nhsca_2025_placement,
        college_opens_experience,
        highlight_video_url
      `)
      .in("id", starredAthleteIds)
      .order("graduationyear", { ascending: false })
      .order("name", { ascending: true })

    if (graduationYear && graduationYear !== "all") {
      query = query.eq("graduationyear", Number.parseInt(graduationYear))
    }

    if (gender && gender !== "all") {
      if (gender === "male") {
        query = query.ilike("gender", "male")
      } else if (gender === "female") {
        query = query.ilike("gender", "female")
      }
    }

    if (minGpa) {
      query = query.gte("academic_gpa", Number.parseFloat(minGpa))
    }

    if (minSat) {
      query = query.gte("academic_sat", Number.parseInt(minSat))
    }

    const { data: prospects, error } = await query

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 })
    }

    const prospectsWithStarInfo = (prospects || []).map((prospect) => {
      const starInfo = starredData.find((s) => s.athlete_id === prospect.id)
      return {
        ...prospect,
        is_starred: true,
        pipeline_stage: starInfo?.pipeline_stage || "prospect",
        interest_level: starInfo?.interest_level,
        starred_at: starInfo?.starred_at,
      }
    })

    return NextResponse.json({
      success: true,
      prospects: prospectsWithStarInfo,
    })
  } catch (error) {
    console.error("Coach portal prospects API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
