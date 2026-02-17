import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getNHSCAFromTables, getSuper32FromTable } from "@/lib/tournament-tables"

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
      .select("*")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      console.error("[v0] Athlete query error:", athleteError)
      return NextResponse.json({ error: "Athlete not found", details: athleteError?.message }, { status: 404 })
    }

    // Get star/recruiting tracking data for this athlete
    const { data: starData, error: starError } = await supabase
      .from("college_coach_stars")
      .select(`
        *
      `)
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", targetCoachId)
      .maybeSingle()

    console.log("[v0] Star query result:", { starData, starError, athleteId, targetCoachId })

    if (starError) {
      console.error("Error fetching star data:", starError)
      console.error("Star error details:", { athleteId, targetCoachId, error: starError })
      return NextResponse.json({ 
        error: "Database error fetching recruiting data", 
        details: starError.message 
      }, { status: 500 })
    }

    // If no star record exists, create a basic one for this coach
    if (!starData) {
      console.log("[v0] No star record found, creating one...")

      const { data: newStar } = await supabase
        .from("college_coach_stars")
        .insert({
          coach_user_id: targetCoachId,
          athlete_id: athleteId,
          pipeline_stage: "Prospect",
          starred_at: new Date().toISOString(),
        })
        .select()
        .single()

      console.log("[v0] Created new star record:", newStar)

      const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
      const highSchool = athlete.highschool ?? athlete.highSchool ?? ""
      const nhsca = await getNHSCAFromTables(supabase, athlete.name, gradYear)
      const super32 = await getSuper32FromTable(supabase, athlete.name, gradYear)
      let athleteToReturn = {
        ...athlete,
        is_starred: false,
        pipeline_stage: "Prospect",
        communication_log: [],
        nhsca_results: nhsca.length ? nhsca : athlete.nhsca_results ?? [],
        super32_results: super32.length ? super32 : athlete.super32_results ?? [],
      }
    return NextResponse.json({
        success: true,
        athlete: athleteToReturn,
      })
    }

    // Merge athlete data with recruiting tracking data
    // Override fields take precedence over base athlete data
    const athleteWithTracking = {
      ...athlete,
      is_starred: true,
      starred_at: starData.starred_at,
      pipeline_stage: starData.pipeline_stage,
      interest_level: starData.interest_level,
      
      // Override fields (coach-specific data)
      phone: starData.override_phone ?? athlete.phone,
      contactEmail: starData.override_email ?? athlete.contactEmail,
      location: starData.override_location ?? athlete.location,
      academic_gpa: starData.override_gpa ?? athlete.academic_gpa,
      academic_sat: starData.override_sat ?? athlete.academic_sat,
      academic_act: starData.override_act ?? athlete.academic_act,
      weightclass: starData.override_weight ?? athlete.weightclass,
      highschool: starData.override_highschool ?? athlete.highschool,
      graduationyear: starData.override_graduation_year ?? athlete.graduationyear,
      birthdate: starData.override_birthdate ?? athlete.birthdate,
      
      // Performance overrides (for manually tracked athletes)
      careerRecord: starData.override_career_record ?? athlete.careerRecord,
      college_opens_experience: starData.override_college_opens ?? athlete.college_opens_experience,
      fargo_experience: starData.override_fargo ?? athlete.fargo_experience,
      nationally_ranked_wins: starData.override_ranked_wins ?? athlete.nationally_ranked_wins,
      
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
      gi_bill_eligible: starData.gi_bill_eligible,
    }

    const gradYear = Number(athlete.graduationyear) || new Date().getFullYear()
    const highSchool = athlete.highschool ?? athlete.highSchool ?? ""
    const nhsca = await getNHSCAFromTables(supabase, athlete.name, gradYear)
    const super32 = await getSuper32FromTable(supabase, athlete.name, gradYear)
    const athleteToReturn = {
      ...athleteWithTracking,
      nhsca_results: nhsca.length ? nhsca : athleteWithTracking.nhsca_results ?? athlete.nhsca_results ?? [],
      super32_results: super32.length ? super32 : athleteWithTracking.super32_results ?? athlete.super32_results ?? [],
    }
    return NextResponse.json({
      success: true,
      athlete: athleteToReturn,
    })
  } catch (error) {
    console.error("Athlete details API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
