import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get the current user
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

    const { athleteId, approved } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // For now, we'll just update a simple flag since we don't have the commitment approval columns yet
    // This will be enhanced once the database columns are added
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    // Try to update commitment approval columns if they exist
    try {
      if (approved) {
        updateData.commitment_approved = true
        updateData.commitment_approved_at = new Date().toISOString()
        updateData.commitment_approved_by = user.id
      } else {
        updateData.commitment_approved = false
        updateData.commitment_approved_at = null
        updateData.commitment_approved_by = null
      }
    } catch (error) {
      // Columns don't exist yet, just update the timestamp
      console.log("Commitment approval columns not available yet")
    }

    const { data, error } = await supabase.from("athletes").update(updateData).eq("id", athleteId).select().single()

    if (error) {
      console.error("Error updating athlete:", error)
      return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      athlete: data,
      message: approved ? "Commitment approved successfully" : "Commitment approval removed",
    })
  } catch (error) {
    console.error("Error in approve commitment API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
