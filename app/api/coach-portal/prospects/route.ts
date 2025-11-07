import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

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
    const viewAsCoachId = searchParams.get("viewAsCoachId") // Admin viewing as specific coach

    const targetSchoolId = schoolId || profile.school_id

    console.log("[v0] Prospects API - User:", user.email)
    console.log("[v0] Prospects API - Profile school_id:", profile.school_id)
    console.log("[v0] Prospects API - Target school_id:", targetSchoolId)
    console.log("[v0] Prospects API - View as coach ID:", viewAsCoachId)

    if (!targetSchoolId) {
      return NextResponse.json({ error: "No school associated with this account" }, { status: 400 })
    }

    // Get all coaches from the school (including when impersonating)
    let coachUserIds: string[] = []
    
    if (viewAsCoachId && profile?.is_admin) {
      console.log("[v0] Prospects API - Admin viewing as specific coach:", viewAsCoachId)
      
      // Get the impersonated coach's school, then get ALL coaches from that school
      const { data: viewAsCoachProfile } = await adminSupabase
        .from("user_profiles")
        .select("school_id")
        .eq("user_id", viewAsCoachId)
        .single()
      
      if (viewAsCoachProfile?.school_id) {
        const { data: schoolCoaches } = await adminSupabase
          .from("user_profiles")
          .select("user_id")
          .eq("school_id", viewAsCoachProfile.school_id)
        
        coachUserIds = schoolCoaches?.map((c) => c.user_id) || []
        console.log("[v0] Prospects API - Impersonating coach, fetching all coaches from their school:", coachUserIds)
      } else {
        // Fallback: just use the impersonated coach if no school
        coachUserIds = [viewAsCoachId]
      }
    } else {
      // Normal flow: get all coaches from this school
      const { data: schoolCoaches } = await adminSupabase
        .from("user_profiles")
        .select("user_id")
        .eq("school_id", targetSchoolId)

      coachUserIds = schoolCoaches?.map((c) => c.user_id) || []
    }

    let activeCoachId: string | null = null

    if (profile?.is_admin) {
      if (viewAsCoachId) {
        activeCoachId = viewAsCoachId
      } else if (profile.school_id && profile.school_id === targetSchoolId) {
        activeCoachId = user.id
      }
    } else {
      activeCoachId = user.id
    }

    if (activeCoachId && !coachUserIds.includes(activeCoachId)) {
      coachUserIds.push(activeCoachId)
    }

    console.log("[v0] Prospects API - Coach user IDs to fetch:", coachUserIds)

    if (coachUserIds.length === 0) {
      return NextResponse.json({ success: true, prospects: [] })
    }

    console.log("[v0] Prospects API - Fetching stars for coach user IDs:", coachUserIds)

    const { data: coachStarredData, error: starError } = await adminSupabase
      .from("college_coach_stars")
      .select(
        "athlete_id, pipeline_stage, interest_level, starred_at, coach_user_id, has_applied, applied_date, financial_efc, financial_aid_needs, scholarship_requirements, ability_to_pay, financial_notes, merit_scholarship_eligible, need_based_aid_eligible, aid_application_status, financial_concerns, gi_bill_eligible, override_phone, override_email, override_location, override_gpa, override_sat, override_act, override_weight, override_highschool, override_graduation_year, override_birthdate, override_career_record, override_college_opens, override_fargo, override_ranked_wins, override_state_championships, override_nhsca_results, override_super32_results, star_rating",
      )
      .in("coach_user_id", coachUserIds)

    if (starError) {
      console.error("[v0] Prospects API - ERROR fetching stars:", starError)
      return NextResponse.json({ error: "Failed to fetch prospects" }, { status: 500 })
    }

    const starredData = coachStarredData || []

    console.log("[v0] Prospects API - Starred athletes found:", starredData?.length || 0)
    console.log("[v0] Prospects API - Starred athlete IDs:", starredData?.map((s: any) => s.athlete_id) || [])
    console.log("[v0] Prospects API - Full starred data sample:", starredData?.slice(0, 3))

    if (!starredData || starredData.length === 0) {
      return NextResponse.json({ success: true, prospects: [] })
    }

    const starredAthleteIds = [...new Set(starredData.map((s) => s.athlete_id))]
    console.log("[v0] Prospects API - Total unique athlete IDs (stars + direct):", starredAthleteIds.length)

    let query = adminSupabase
      .from("athletes")
      .select(`
        id,
        name,
        firstName,
        lastName,
        graduationyear,
        birthdate,
        gender,
        weightclass,
        highschool,
        wrestlingClub,
        photourl,
        achievements,
        prospect_ranking,
        recruiting_status,
        college,
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
      .not("recruiting_status", "eq", "College Athlete")
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
        star_rating: starInfo?.star_rating || null,
        // Override fields take precedence over base athlete data
        phone: starInfo?.override_phone ?? prospect.phone,
        contactEmail: starInfo?.override_email ?? prospect.contactEmail,
        location: starInfo?.override_location ?? prospect.location,
        academic_gpa: starInfo?.override_gpa ?? prospect.academic_gpa,
        academic_sat: starInfo?.override_sat ?? prospect.academic_sat,
        academic_act: starInfo?.override_act ?? prospect.academic_act,
        weightclass: starInfo?.override_weight ?? prospect.weightclass,
        highschool: starInfo?.override_highschool ?? prospect.highschool,
        graduationyear: starInfo?.override_graduation_year ?? prospect.graduationyear,
        birthdate: starInfo?.override_birthdate ?? prospect.birthdate,
        // Performance overrides
        careerRecord: starInfo?.override_career_record ?? prospect.careerRecord,
        college_opens_experience: starInfo?.override_college_opens ?? prospect.college_opens_experience,
        fargo_experience: starInfo?.override_fargo ?? prospect.fargo_experience,
        nationally_ranked_wins: starInfo?.override_ranked_wins ?? prospect.nationally_ranked_wins,
        financial_efc: starInfo?.financial_efc,
        financial_aid_needs: starInfo?.financial_aid_needs,
        scholarship_requirements: starInfo?.scholarship_requirements,
        ability_to_pay: starInfo?.ability_to_pay,
        financial_notes: starInfo?.financial_notes,
        merit_scholarship_eligible: starInfo?.merit_scholarship_eligible || false,
        need_based_aid_eligible: starInfo?.need_based_aid_eligible || false,
        aid_application_status: starInfo?.aid_application_status,
        financial_concerns: starInfo?.financial_concerns,
        gi_bill_eligible: starInfo?.gi_bill_eligible || false,
        has_applied: starInfo?.has_applied || false,
        applied_date: starInfo?.applied_date || null,
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
