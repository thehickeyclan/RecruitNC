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

    const activeCoachId = viewAsCoachId && profile?.is_admin ? viewAsCoachId : user.id
    if (activeCoachId && !coachUserIds.includes(activeCoachId)) {
      coachUserIds.push(activeCoachId)
    }

    if (coachUserIds.length === 0 && activeCoachId) {
      coachUserIds = [activeCoachId]
    }

    console.log("[v0] Prospects API - Coach user IDs to fetch:", coachUserIds)

    // If admin is viewing a school portal (schoolId param provided) but no coaches exist,
    // allow them to see prospects associated with admins for this school
    let starredData = null
    if (coachUserIds.length === 0 && profile?.is_admin && schoolId) {
      console.log("[v0] Prospects API - No coaches found, but admin is viewing school portal. Checking for admin-added prospects...")
      
      // For admin preview: look for athletes associated with admins where notes mention this school
      // OR create a mechanism to tag athletes with schools
      // For now, we'll check notes for school name pattern
      const { data: schoolInfo } = await supabase
        .from("schools")
        .select("name")
        .eq("id", targetSchoolId)
        .single()

      if (schoolInfo) {
        // Get all admin user IDs
        const { data: adminUsers } = await supabase
          .from("user_profiles")
          .select("user_id")
          .or("is_admin.eq.true,role.eq.admin")

        const adminUserIds = adminUsers?.map((u) => u.user_id) || []

        if (adminUserIds.length > 0) {
          // Get athletes where notes mention this school name
          const { data: adminStarredData } = await adminSupabase
            .from("college_coach_stars")
            .select("athlete_id, pipeline_stage, interest_level, starred_at, coach_user_id, financial_efc, financial_aid_needs, scholarship_requirements, ability_to_pay, financial_notes, merit_scholarship_eligible, need_based_aid_eligible, aid_application_status, financial_concerns, gi_bill_eligible, notes, override_phone, override_email, override_location, override_gpa, override_sat, override_act, override_weight, override_highschool, override_graduation_year, override_birthdate, override_career_record, override_college_opens, override_fargo, override_ranked_wins, override_state_championships, override_nhsca_results, override_super32_results, star_rating")
            .in("coach_user_id", adminUserIds)
            .ilike("notes", `%${schoolInfo.name}%`)

          starredData = adminStarredData
          console.log("[v0] Prospects API - Found % admin-added prospects for %", adminStarredData?.length || 0, schoolInfo.name)
        }
      }
    } else if (coachUserIds.length === 0) {
      return NextResponse.json({ success: true, prospects: [] })
    }

    // If we have coaches, get their starred athletes (normal flow)
    if ((!starredData || starredData.length === 0) && coachUserIds.length > 0) {
      console.log("[v0] Prospects API - Fetching stars for coach user IDs:", coachUserIds)
      
      const { data: coachStarredData, error: starError } = await adminSupabase
        .from("college_coach_stars")
        .select("athlete_id, pipeline_stage, interest_level, starred_at, coach_user_id, financial_efc, financial_aid_needs, scholarship_requirements, ability_to_pay, financial_notes, merit_scholarship_eligible, need_based_aid_eligible, aid_application_status, financial_concerns, gi_bill_eligible, override_phone, override_email, override_location, override_gpa, override_sat, override_act, override_weight, override_highschool, override_graduation_year, override_birthdate, override_career_record, override_college_opens, override_fargo, override_ranked_wins, override_state_championships, override_nhsca_results, override_super32_results, star_rating")
        .in("coach_user_id", coachUserIds)

      if (starError) {
        console.error("[v0] Prospects API - ERROR fetching stars:", starError)
      } else {
        console.log("[v0] Prospects API - Stars query returned:", coachStarredData?.length, "records")
      }
      
      starredData = coachStarredData
    }

    console.log("[v0] Prospects API - Starred athletes found:", starredData?.length || 0)
    console.log("[v0] Prospects API - Starred athlete IDs:", starredData?.map((s: any) => s.athlete_id) || [])
    console.log("[v0] Prospects API - Full starred data sample:", starredData?.slice(0, 3))

    // ALSO check athletes table directly for athletes whose college field matches this school
    // This catches athletes committed via the admin athlete profile "college" tab
    const { data: schoolInfo } = await supabase
      .from("schools")
      .select("name")
      .eq("id", targetSchoolId)
      .single()

    let adminStarredForSchool: any[] = []
    let directCollegeAthletes: any[] = []
    if (profile?.is_admin && schoolInfo?.name) {
      console.log("[v0] Prospects API - Checking athletes.college field for school:", schoolInfo.name)

      const { data: adminUsers } = await supabase
        .from("user_profiles")
        .select("user_id")
        .or("is_admin.eq.true,role.eq.admin")

      const adminUserIds = adminUsers?.map((u) => u.user_id) || []

      if (adminUserIds.length > 0) {
        const { data: adminStars, error: adminStarError } = await adminSupabase
          .from("college_coach_stars")
          .select(
            "athlete_id, pipeline_stage, interest_level, starred_at, coach_user_id, financial_efc, financial_aid_needs, scholarship_requirements, ability_to_pay, financial_notes, merit_scholarship_eligible, need_based_aid_eligible, aid_application_status, financial_concerns, gi_bill_eligible, notes, override_phone, override_email, override_location, override_gpa, override_sat, override_act, override_weight, override_highschool, override_graduation_year, override_birthdate, override_career_record, override_college_opens, override_fargo, override_ranked_wins, override_state_championships, override_nhsca_results, override_super32_results, star_rating"
          )
          .in("coach_user_id", adminUserIds)
          .ilike("notes", `%${schoolInfo.name}%`)

        if (adminStarError) {
          console.error("[v0] Prospects API - ERROR fetching admin-starred athletes for school:", adminStarError)
        } else if (adminStars?.length) {
          adminStarredForSchool = adminStars
          console.log("[v0] Prospects API - Found", adminStars.length, "admin-starred athletes for", schoolInfo.name)
        }
      }

      // Try exact match with school name
      // EXCLUDE College Athletes - they should only appear in Pipeline History
      const { data: exactMatch } = await supabase
        .from("athletes")
        .select("id, recruiting_status")
        .ilike("college", `%${schoolInfo.name}%`)
        .not("recruiting_status", "eq", "College Athlete")
      
      if (exactMatch) {
        directCollegeAthletes.push(...exactMatch)
      }
      
      // Try shortened name (e.g., "Lynchburg" from "Lynchburg College")
      const shortName = schoolInfo.name.replace(/College|University|Institute|School/i, "").trim()
      if (shortName && shortName.length > 2 && shortName !== schoolInfo.name) {
        const { data: shortMatch } = await supabase
          .from("athletes")
          .select("id, recruiting_status")
          .ilike("college", `%${shortName}%`)
          .not("recruiting_status", "eq", "College Athlete")
        
        if (shortMatch) {
          const existingIds = new Set(directCollegeAthletes.map(a => a.id))
          directCollegeAthletes.push(...shortMatch.filter(a => !existingIds.has(a.id)))
        }
      }
      
      console.log("[v0] Prospects API - Found athletes with matching college field:", directCollegeAthletes.length)
      
      // Debug: Check if Cameron Gue is in the direct matches
      const cameronMatch = directCollegeAthletes.find(a => a.id === "969fb4a7-fe96-4b95-bf3e-4adf2a3d16f8")
      if (cameronMatch) {
        console.log("[v0] Prospects API - ✅ Cameron Gue FOUND in direct college matches:", cameronMatch)
      } else {
        console.log("[v0] Prospects API - ❌ Cameron Gue NOT in direct college matches")
      }
      
      // Create star-like entries for these athletes (if not already starred)
      const existingStarredIds = new Set((starredData || []).map(s => s.athlete_id))
      console.log("[v0] Prospects API - Existing starred IDs count:", existingStarredIds.size)
      
      const newDirectStars = directCollegeAthletes
        .filter(a => !existingStarredIds.has(a.id))
        .map(a => ({
          athlete_id: a.id,
          pipeline_stage: a.recruiting_status || "Committed",
          interest_level: "high",
          starred_at: new Date().toISOString(),
          coach_user_id: user.id, // Use current user as placeholder
        }))
      
      if (newDirectStars.length > 0) {
        console.log("[v0] Prospects API - Adding", newDirectStars.length, "direct college matches to prospects")
        starredData = [...(starredData || []), ...newDirectStars]
      }
    }

    // Merge in admin-starred athletes tagged for this school (if not already present)
    if (adminStarredForSchool.length > 0) {
      const existingIds = new Set((starredData || []).map((s: any) => s.athlete_id))
      const mergedStarData = Array.isArray(starredData) ? [...starredData] : []

      for (const adminStar of adminStarredForSchool) {
        if (!existingIds.has(adminStar.athlete_id)) {
          mergedStarData.push(adminStar)
          existingIds.add(adminStar.athlete_id)
        }
      }

      starredData = mergedStarData
      console.log("[v0] Prospects API - Added", adminStarredForSchool.length, "admin-tagged athletes to school results")
    }

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
