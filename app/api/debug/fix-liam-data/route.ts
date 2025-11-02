import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { action, athleteId, updates } = await request.json()

    if (!action || !athleteId) {
      return NextResponse.json({ error: "Missing action or athleteId" }, { status: 400 })
    }

    let result
    let message = ""

    switch (action) {
      case "fix_photo":
        if (!updates?.photoUrl) {
          return NextResponse.json({ error: "Missing photoUrl in updates" }, { status: 400 })
        }

        result = await supabase
          .from("athletes")
          .update({
            image_url: updates.photoUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", athleteId)

        message = "Photo URL updated successfully"
        break

      case "fix_date":
        if (!updates?.commitmentDate) {
          return NextResponse.json({ error: "Missing commitmentDate in updates" }, { status: 400 })
        }

        result = await supabase
          .from("athletes")
          .update({
            commitment_date: updates.commitmentDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", athleteId)

        message = "Commitment date updated successfully"
        break

      case "unclaim_profile":
        result = await supabase
          .from("athletes")
          .update({
            claimed_by_user_id: null,
            claimed_at: null,
            profile_verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", athleteId)

        message = "Profile unclaimed successfully"
        break

      case "claim_as_admin":
        result = await supabase
          .from("athletes")
          .update({
            claimed_by_user_id: user.id,
            claimed_at: new Date().toISOString(),
            profile_verified: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", athleteId)

        message = "Profile claimed as admin successfully"
        break

      case "verify_profile":
        result = await supabase
          .from("athletes")
          .update({
            profile_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", athleteId)

        message = "Profile verified successfully"
        break

      case "fix_all_data":
        // Fix multiple issues at once
        const updateData: any = {
          updated_at: new Date().toISOString(),
        }

        if (updates?.photoUrl) {
          updateData.image_url = updates.photoUrl
        }

        if (updates?.commitmentDate) {
          updateData.commitment_date = updates.commitmentDate
        }

        if (updates?.unclaim) {
          updateData.claimed_by_user_id = null
          updateData.claimed_at = null
          updateData.profile_verified = false
        }

        result = await supabase.from("athletes").update(updateData).eq("id", athleteId)

        message = "All data fixed successfully"
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (result?.error) {
      console.error("Database error:", result.error)
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message,
      action,
      athleteId,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in fix-liam-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
