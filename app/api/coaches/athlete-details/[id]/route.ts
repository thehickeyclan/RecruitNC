import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const athleteId = params.id
    const { searchParams } = new URL(request.url)
    const viewAsCoachId = searchParams.get("viewAsCoachId")

    // Determine which coach's data to fetch
    const targetCoachId = viewAsCoachId || user.id

    console.log("[v0] Athlete details - User:", user.email)
    console.log("[v0] Athlete details - Target coach ID:", targetCoachId)
    console.log("[v0] Athlete details - View as coach ID:", viewAsCoachId)

    // Get athlete data
    const { data: athlete, error: athleteError } = await supabase
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
        college_opens_experience,
        highlight_video_url,
        super_32_2023_record,
        super_32_2023_placement,
        super_32_2024_record,
        super_32_2024_placement,
        super_32_2025_record,
        super_32_2025_placement,
        nhsca_2024_record,
        nhsca_2024_placement,
        nhsca_2025_record,
        nhsca_2025_placement
      `)
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Get star/recruiting tracking data for this athlete
    const { data: starData, error: starError } = await supabase
      .from("college_coach_stars")
      .select(`
        *
      `)
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", targetCoachId)
      .single()

    if (starError) {
      console.error("Error fetching star data:", starError)
      console.error("Star error details:", { athleteId, targetCoachId, error: starError })
      // If no star data exists, athlete might not be starred by this coach
      return NextResponse.json({ 
        error: "Athlete not in recruits list", 
        details: starError.message 
      }, { status: 404 })
    }

    // Merge athlete data with recruiting tracking data
    const athleteWithTracking = {
      ...athlete,
      is_starred: true,
      starred_at: starData.starred_at,
      pipeline_stage: starData.pipeline_stage,
      interest_level: starData.interest_level,
      
      // Milestone tracking
      first_contact_date: starData.first_contact_date,
      first_contact_method: starData.first_contact_method,
      has_applied: starData.has_applied,
      applied_date: starData.applied_date,
      campus_visit_date: starData.campus_visit_date,
      campus_visit_type: starData.campus_visit_type,
      official_visit_date: starData.official_visit_date,
      financial_package_sent: starData.financial_package_sent,
      package_sent_date: starData.package_sent_date,
      package_amount: starData.package_amount,
      offer_extended: starData.offer_extended,
      offer_date: starData.offer_date,
      offer_details: starData.offer_details,
      committed_date: starData.committed_date,
      nli_signed_date: starData.nli_signed_date,
      communication_log: starData.communication_log || [],
      recruiting_notes: starData.recruiting_notes,
      
      // Financial aid
      financial_efc: starData.financial_efc,
      financial_aid_needs: starData.financial_aid_needs,
      scholarship_requirements: starData.scholarship_requirements,
      ability_to_pay: starData.ability_to_pay,
      financial_notes: starData.financial_notes,
      merit_scholarship_eligible: starData.merit_scholarship_eligible,
      need_based_aid_eligible: starData.need_based_aid_eligible,
      aid_application_status: starData.aid_application_status,
      financial_concerns: starData.financial_concerns,
    }

    return NextResponse.json({
      success: true,
      athlete: athleteWithTracking,
    })
  } catch (error) {
    console.error("Athlete details API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

