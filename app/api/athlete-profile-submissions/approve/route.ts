import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { submissionId } = await request.json()

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

    const { data: submission, error: fetchError } = await supabase
      .from("athlete_profile_submissions")
      .select("*")
      .eq("id", submissionId)
      .single()

    if (fetchError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    const { data: athlete, error: createError } = await supabase
      .from("athletes")
      .insert({
        firstName: submission.firstname,
        lastName: submission.lastname,
        name: `${submission.firstname} ${submission.lastname}`,
        gender: submission.gender,
        graduationyear: submission.graduationyear,
        weightclass: submission.weightclass,
        highschool: submission.highschool,
        wrestlingClub: submission.wrestling_club,
        location: submission.location,
        contactEmail: submission.email,
        phone: submission.phone,
        bio: submission.bio,
        achievements: submission.achievements ? [submission.achievements] : [],
        recruiting_status: "Uncommitted",
        is_prospect: true,
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating athlete:", createError)
      return NextResponse.json({ error: "Failed to create athlete profile" }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("athlete_profile_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", submissionId)

    if (updateError) {
      console.error("Error updating submission:", updateError)
    }

    return NextResponse.json({ success: true, athlete }, { status: 200 })
  } catch (error) {
    console.error("Error approving submission:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
