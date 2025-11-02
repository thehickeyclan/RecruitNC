import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("school_id").eq("user_id", user.id).single()

    if (!profile?.school_id) {
      return NextResponse.json({ error: "No school associated with this account" }, { status: 400 })
    }

    // Get all coaches from the same school
    const { data: schoolCoaches } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", profile.school_id)

    const coachUserIds = schoolCoaches?.map((c) => c.user_id) || [user.id]

    // Fetch stars for ALL coaches from the same school
    const { data: stars, error: starsError } = await supabase
      .from("college_coach_stars")
      .select("*")
      .in("coach_user_id", coachUserIds)
      .order("starred_at", { ascending: false })
    // </CHANGE>

    if (starsError) {
      console.error("Error fetching stars:", starsError)
      return NextResponse.json({ error: starsError.message }, { status: 500 })
    }

    if (!stars || stars.length === 0) {
      return NextResponse.json({ athletes: [] })
    }

    const athleteIds = stars.map((s) => s.athlete_id)

    const { data: athletes, error: athletesError } = await supabase.from("athletes").select("*").in("id", athleteIds)

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: athletesError.message }, { status: 500 })
    }

    const { data: notes, error: notesError } = await supabase
      .from("recruiting_notes")
      .select("*")
      .in("coach_user_id", coachUserIds)
      .in("athlete_id", athleteIds)
      .order("created_at", { ascending: false })

    if (notesError) {
      console.error("Error fetching notes:", notesError)
    }

    const { data: actions, error: actionsError } = await supabase
      .from("recruiting_actions")
      .select("*")
      .in("coach_user_id", coachUserIds)
      .in("athlete_id", athleteIds)
      .order("action_date", { ascending: false })
    // </CHANGE>

    if (actionsError) {
      console.error("Error fetching actions:", actionsError)
    }

    const result = stars
      .map((star) => {
        const athlete = athletes?.find((a) => a.id === star.athlete_id)
        if (!athlete) return null

        const athleteNotes = notes?.filter((n) => n.athlete_id === star.athlete_id) || []
        const athleteActions = actions?.filter((a) => a.athlete_id === star.athlete_id) || []

        return {
          id: athlete.id,
          name: athlete.wrestling_name || athlete.name || `${athlete.firstName || ""} ${athlete.lastName || ""}`.trim(),
          graduation_year: athlete.graduation_year || athlete.graduationyear,
          weightclass: athlete.weightclass,
          highschool: athlete.highschool,
          photourl: athlete.photourl || athlete.headshot_url,
          college: athlete.college,
          starred_at: star.starred_at,
          star_notes: star.notes,
          interest_level: star.interest_level,
          notes: athleteNotes,
          actions: athleteActions,
          updated_at: athlete.updated_at || athlete.updatedAt || athlete.created_at,
          careerRecord: athlete.careerRecord,
          location: athlete.location,
          pipeline_stage: star.pipeline_stage || "Prospect",
          last_contacted: star.last_contacted,
          star_id: star.id,
          athlete_email: athlete.contactEmail || star.athlete_email,
          athlete_cell: athlete.phone || star.athlete_cell,
          athlete_instagram: athlete.socialMedia?.instagram || star.athlete_instagram,
          parent_name: star.parent_name,
          parent_phone: star.parent_phone,
          parent_email: star.parent_email,
          academic_gpa: athlete.academic_gpa,
          academic_sat: athlete.academic_sat,
          academic_act: athlete.academic_act,
          academic_interest: athlete.academic_interest,
          academic_summary: athlete.academic_summary,
          nhsca_2023_placement: athlete.nhsca_2023_placement,
          nhsca_2023_record: athlete.nhsca_2023_record,
          nhsca_2024_placement: athlete.nhsca_2024_placement,
          nhsca_2024_record: athlete.nhsca_2024_record,
          nhsca_2025_placement: athlete.nhsca_2025_placement,
          nhsca_2025_record: athlete.nhsca_2025_record,
          super_32_2023_placement: athlete.super_32_2023_placement,
          super_32_2023_record: athlete.super_32_2023_record,
          super_32_2024_placement: athlete.super_32_2024_placement,
          super_32_2024_record: athlete.super_32_2024_record,
          super_32_2025_placement: athlete.super_32_2025_placement,
          super_32_2025_record: athlete.super_32_2025_record,
          nationally_ranked_wins: athlete.nationally_ranked_wins,
          additional_achievements: athlete.additional_achievements,
          college_opens_experience: athlete.college_opens_experience,
          highlight_video_url: athlete.highlight_video_url,
          bio: athlete.bio,
          bio_headline: athlete.bio_headline,
          wrestlingClub: athlete.wrestlingClub,
          ncUnitedTeam: athlete.ncUnitedTeam,
          recruiting_status: athlete.recruiting_status,
          prospect_notes: athlete.prospect_notes,
          evaluation_notes: athlete.evaluation_notes,
          socialMedia: athlete.socialMedia,
          ranking: athlete.prospect_ranking,
          financial_efc: star.financial_efc,
          financial_aid_needs: star.financial_aid_needs,
          scholarship_requirements: star.scholarship_requirements,
          ability_to_pay: star.ability_to_pay,
          financial_notes: star.financial_notes,
          merit_scholarship_eligible: star.merit_scholarship_eligible,
          need_based_aid_eligible: star.need_based_aid_eligible,
          aid_application_status: star.aid_application_status,
          financial_concerns: star.financial_concerns,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ athletes: result })
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
