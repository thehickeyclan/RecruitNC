import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated and is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { submissionId, action, adminNotes } = await request.json()

    if (!submissionId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Get the submission details
    const { data: submission, error: fetchError } = await supabase
      .from("athlete_profile_submissions")
      .select("*")
      .eq("id", submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    if (submission.status !== "pending") {
      return NextResponse.json({ error: "Submission already reviewed" }, { status: 400 })
    }

    // Update submission status
    const { error: updateError } = await supabase
      .from("athlete_profile_submissions")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        admin_notes: adminNotes || null,
      })
      .eq("id", submissionId)

    if (updateError) {
      console.error("Error updating submission:", updateError)
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 })
    }

    // If approved, create athlete profile
    if (action === "approve") {
      const { error: createError } = await supabase.from("athletes").insert({
        // Basic info
        firstName: submission.firstname,
        lastName: submission.lastname,
        name: `${submission.firstname} ${submission.lastname}`,
        gender: submission.gender,
        graduationyear: submission.graduationyear,
        weightclass: submission.weightclass,
        college_weight_class: submission.college_weight_class,
        highschool: submission.highschool,
        highSchoolDivision: submission.high_school_division,
        wrestlingClub: submission.wrestling_club,
        location: submission.location,
        contactEmail: submission.email,
        phone: submission.phone,
        
        // Bio & achievements
        bio_headline: submission.bio_headline,
        bio: submission.bio,
        achievements: submission.achievements ? [submission.achievements] : [],
        additional_achievements: submission.additional_achievements,
        careerRecord: submission.career_record,
        
        // Social media
        socialMedia: {
          instagram: submission.instagram || null,
          twitter: submission.twitter || null,
          facebook: submission.facebook || null,
        },
        
        // Academic
        academic_gpa: submission.gpa,
        academic_sat: submission.sat,
        academic_act: submission.act,
        academic_summary: submission.academic_summary,
        academic_interest: submission.academic_interest,
        
        // Tournament records
        super_32_2023_record: submission.super_32_2023_record,
        super_32_2023_placement: submission.super_32_2023_placement,
        super_32_2024_record: submission.super_32_2024_record,
        super_32_2024_placement: submission.super_32_2024_placement,
        super_32_2025_record: submission.super_32_2025_record,
        super_32_2025_placement: submission.super_32_2025_placement,
        nhsca_2023_record: submission.nhsca_2023_record,
        nhsca_2023_placement: submission.nhsca_2023_placement,
        nhsca_2024_record: submission.nhsca_2024_record,
        nhsca_2024_placement: submission.nhsca_2024_placement,
        nhsca_2025_record: submission.nhsca_2025_record,
        nhsca_2025_placement: submission.nhsca_2025_placement,
        nationally_ranked_wins: submission.nationally_ranked_wins,
        college_opens_experience: submission.college_opens_experience,
        
        // Media
        highlight_video_url: submission.highlight_video_url,
        headshot_url: submission.headshot_url,
        photourl: submission.headshot_url, // Use headshot as main photo
        
        // Status
        is_prospect: true,
        recruiting_status: "Uncommitted",
        prospect_status: "uncommitted",
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (createError) {
        console.error("Error creating athlete profile:", createError)
        return NextResponse.json({ error: "Failed to create athlete profile" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
