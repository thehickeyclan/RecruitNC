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

    const { requestId, action, adminNotes } = await request.json()

    if (!requestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Get the verification request details
    const { data: verificationRequest, error: fetchError } = await supabase
      .from("coach_verification_requests")
      .select("*")
      .eq("id", requestId)
      .single()

    if (fetchError || !verificationRequest) {
      return NextResponse.json({ error: "Verification request not found" }, { status: 404 })
    }

    if (verificationRequest.status !== "pending") {
      return NextResponse.json({ error: "Request already reviewed" }, { status: 400 })
    }

    // Update verification request status
    const { error: updateError } = await supabase
      .from("coach_verification_requests")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        admin_notes: adminNotes || null,
      })
      .eq("id", requestId)

    if (updateError) {
      console.error("Error updating verification request:", updateError)
      return NextResponse.json({ error: "Failed to update verification request" }, { status: 500 })
    }

    // If approved, update user profile to verified coach
    if (action === "approve") {
      const { error: profileUpdateError } = await supabase
        .from("user_profiles")
        .update({
          verified_coach: true,
          role: "coach",
          institution: verificationRequest.institution,
          coaching_position: verificationRequest.coaching_position,
          years_experience: verificationRequest.years_experience,
          public_profile: true, // Make profile public by default
        })
        .eq("user_id", verificationRequest.user_id)

      if (profileUpdateError) {
        console.error("Error updating user profile:", profileUpdateError)
        return NextResponse.json({ error: "Failed to update coach profile" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
