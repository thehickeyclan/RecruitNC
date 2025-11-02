import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

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
        firstName: submission.firstName,
        lastName: submission.lastName,
        gender: submission.gender,
        graduationYear: submission.graduationYear,
        weightClass: submission.weightClass,
        highSchool: submission.highSchool,
        location: submission.location,
        bio: submission.bio,
        achievements: submission.achievements ? [submission.achievements] : null,
        photoUrl: submission.photoUrl,
        contactEmail: submission.email,
        is_prospect: true,
        recruiting_status: "Uncommitted",
        socialMedia: {
          twitter: null,
          instagram: null,
          facebook: null,
        },
        rankings: {
          state: null,
          national: null,
        },
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
