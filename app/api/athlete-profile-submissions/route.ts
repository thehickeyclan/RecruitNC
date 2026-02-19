import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { normalizePhoneForStorage } from "@/lib/phone-format"

// No review process: create athlete in athletes table immediately and publish.
// If an athlete with same name + graduation year (and school) already exists, we link the user to that profile instead of creating a duplicate.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body.firstName || !body.lastName || !body.gender || !body.graduationYear || !body.email) {
      return NextResponse.json({
        error: "Missing required fields",
        details: "firstName, lastName, gender, graduationYear, and email are required",
      }, { status: 400 })
    }

    const graduationyear = Number.parseInt(body.graduationYear, 10)
    if (Number.isNaN(graduationyear)) {
      return NextResponse.json({
        error: "Invalid graduation year",
        details: `"${body.graduationYear}" is not a valid number`,
      }, { status: 400 })
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized", details: "Sign in to create a profile" }, { status: 401 })
    }
    const now = new Date().toISOString()
    const athleteName = `${String(body.firstName).trim()} ${String(body.lastName).trim()}`

    const adminSupabase = createAdminClient()

    if (!body.forceCreate) {
      const existing = await findExistingAthlete(adminSupabase, {
        name: athleteName,
        graduationYear: graduationyear,
        school: body.highSchool || undefined,
      })
      if (existing) {
        const { data: existingRow } = await adminSupabase
          .from("athletes")
          .select("highschool, graduationyear")
          .eq("id", existing.id)
          .single()
        return NextResponse.json({
          success: true,
          existing: true,
          confirmRequired: true,
          athleteId: existing.id,
          athleteName: existing.name,
          highschool: (existingRow as any)?.highschool ?? body.highSchool ?? "",
          graduationYear: graduationyear,
          message: "We found an existing profile. Please confirm it's yours before we link you.",
        }, { status: 200 })
      }
    }

    const athletePayload: Record<string, unknown> = {
      name: athleteName,
      firstname: body.firstName?.trim() ?? null,
      lastname: body.lastName?.trim() ?? null,
      gender: body.gender,
      graduationyear,
      weightclass: body.weightClass || null,
      college_weight_class: body.collegeWeightClass || null,
      highschool: body.highSchool || null,
      high_school_division: body.highSchoolDivision || null,
      wrestling_club: body.wrestlingClub || null,
      location: body.location || null,
      contact_email: body.email,
      phone: body.phone ? normalizePhoneForStorage(body.phone) : null,
      bio_headline: body.bioHeadline || null,
      bio: body.bio || null,
      achievements: body.achievements || null,
      additional_achievements: body.additionalAchievements || null,
      state_qualifier: body.stateQualifier || null,
      regional_placer: body.regionalPlacer || null,
      conference_placer: body.conferencePlacer || null,
      career_record: body.careerRecord || null,
      highlight_video_url: body.highlightVideoUrl || null,
      headshot_url: body.headshotUrl || null,
      photourl: body.headshotUrl || null,
      gpa: body.gpa != null && body.gpa !== "" ? Number.parseFloat(body.gpa) : null,
      sat: body.sat != null && body.sat !== "" ? Number.parseInt(body.sat, 10) : null,
      act: body.act != null && body.act !== "" ? Number.parseInt(body.act, 10) : null,
      academic_summary: body.academicSummary || null,
      academic_interest: body.academicInterest || null,
      super_32_2023_record: body.super32_2023_record || null,
      super_32_2023_placement: body.super32_2023_placement || null,
      super_32_2024_record: body.super32_2024_record || null,
      super_32_2024_placement: body.super32_2024_placement || null,
      super_32_2025_record: body.super32_2025_record || null,
      super_32_2025_placement: body.super32_2025_placement || null,
      nhsca_2023_record: body.nhsca_2023_record || null,
      nhsca_2023_placement: body.nhsca_2023_placement || null,
      nhsca_2024_record: body.nhsca_2024_record || null,
      nhsca_2024_placement: body.nhsca_2024_placement || null,
      nhsca_2025_record: body.nhsca_2025_record || null,
      nhsca_2025_placement: body.nhsca_2025_placement || null,
      nationally_ranked_wins: body.nationallyRankedWins || null,
      college_opens_experience: body.collegeOpensExperience || null,
      recruiting_status: "Uncommitted",
      is_prospect: true,
      profile_verified: true,
      updated_at: now,
      claimed_by_user_id: user.id,
      claimed_at: now,
    }

    const columns = await getAthletesColumnNames(adminSupabase)
    const filteredPayload = filterPayloadToSchema(athletePayload, columns)

    const { data: athlete, error } = await adminSupabase
      .from("athletes")
      .insert(filteredPayload)
      .select("id, name")
      .single()

    if (error) {
      console.error("[Profile Submission] athletes insert error:", error)
      return NextResponse.json({
        error: "Failed to create profile",
        details: error.message,
      }, { status: 500 })
    }

    // Link this athlete to the user's profile so "My Profile" shows it (admin client avoids RLS blocking)
    const { error: profileLinkError } = await adminSupabase
      .from("user_profiles")
      .update({
        athlete_id: athlete.id,
        athlete_name: athlete.name,
      })
      .eq("user_id", user.id)

    if (profileLinkError) {
      console.error("[Profile Submission] user_profiles link error:", profileLinkError)
      return NextResponse.json({
        error: "Profile created but could not link to your account",
        details: profileLinkError.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      athleteId: athlete.id,
      athleteName: athlete.name,
      message: "Profile created and live. You can edit it anytime.",
    }, { status: 201 })
  } catch (error: any) {
    console.error("[Profile Submission] Unexpected error:", {
      message: error?.message,
      stack: error?.stack,
      error: error
    })
    return NextResponse.json({ 
      error: "Internal server error",
      details: error?.message || "Unknown error occurred"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: submissions, error } = await supabase
      .from("athlete_profile_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })

    if (error) {
      console.error("Error fetching submissions:", error)
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 })
    }

    return NextResponse.json({ submissions }, { status: 200 })
  } catch (error) {
    console.error("Error in GET profile submissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
