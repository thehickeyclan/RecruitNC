import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

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

    const { coachId, action, adminNotes, schoolId } = await request.json()

    console.log("[v0] Review request:", { coachId, action, adminNotes, schoolId })

    if (!coachId || !action || !["approve", "reject"].includes(action)) {
      console.log("[v0] Validation failed:", { coachId, action })
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    const adminSupabase = createServiceRoleClient()

    // Get the coach profile
    const { data: coachProfile, error: fetchError } = await adminSupabase
      .from("user_profiles")
      .select("*")
      .eq("id", coachId)
      .single()

    if (fetchError || !coachProfile) {
      console.error("Error fetching coach profile:", fetchError)
      return NextResponse.json({ error: "Coach profile not found" }, { status: 404 })
    }

    console.log("[v0] Coach profile:", coachProfile)

    const validCoachTypes = ["college-coach", "college_coach", "coach"]
    const isValidCoach =
      validCoachTypes.includes(coachProfile.profile_type) || validCoachTypes.includes(coachProfile.role)

    if (!isValidCoach) {
      console.log("[v0] Not a valid coach:", { profile_type: coachProfile.profile_type, role: coachProfile.role })
      return NextResponse.json({ error: "Profile is not a college coach" }, { status: 400 })
    }

    // Update coach profile
    if (action === "approve") {
      const updateData: any = {
        verified_coach: true,
        role: "coach",
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        verification_status: "approved",
        admin_notes: adminNotes || null,
      }

      // Add school_id if provided
      if (schoolId) {
        updateData.school_id = schoolId
      }

      const { error: updateError } = await adminSupabase.from("user_profiles").update(updateData).eq("id", coachId)

      if (updateError) {
        console.error("Error updating coach profile:", updateError)
        return NextResponse.json({ error: "Failed to approve coach" }, { status: 500 })
      }
    } else {
      const { error: updateError } = await adminSupabase
        .from("user_profiles")
        .update({
          verified_coach: false,
          verification_status: "rejected",
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          admin_notes: adminNotes || null,
        })
        .eq("id", coachId)

      if (updateError) {
        console.error("Error rejecting coach:", updateError)
        return NextResponse.json({ error: "Failed to reject coach" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
