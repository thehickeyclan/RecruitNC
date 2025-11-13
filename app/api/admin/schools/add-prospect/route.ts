import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { athleteId, schoolId, pipelineStage, notes, interestLevel } = await request.json()

    if (!athleteId || !schoolId) {
      return NextResponse.json({ error: "Athlete ID and School ID are required" }, { status: 400 })
    }

    // Use service role client to bypass RLS for admin operations
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Verify athlete exists
    const { data: athlete, error: athleteError } = await adminSupabase
      .from("athletes")
      .select("id, name")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Get all coaches for this school (may be empty if no coaches yet)
    const { data: coaches } = await adminSupabase
      .from("user_profiles")
      .select("user_id")
      .eq("school_id", schoolId)
      .in("role", ["coach", "college_coach", "admin"])

    const coachUserIds = coaches?.map((c) => c.user_id) || []

    // Check if athlete is already starred for this school
    let existingStar = null
    if (coachUserIds.length > 0) {
      const { data: existing } = await adminSupabase
        .from("college_coach_stars")
        .select("id, coach_user_id")
        .eq("athlete_id", athleteId)
        .in("coach_user_id", coachUserIds)
        .maybeSingle()

      existingStar = existing
    }

    if (existingStar) {
      // Update existing star with new stage
      const { data, error } = await adminSupabase
        .from("college_coach_stars")
        .update({
          pipeline_stage: pipelineStage || "Committed",
          notes: notes || existingStar.notes,
          interest_level: interestLevel || existingStar.interest_level,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStar.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating prospect:", error)
        return NextResponse.json({ error: "Failed to update prospect" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data, action: "updated" })
    } else {
      // Create new star record
      // Use admin's user_id if no coaches exist, otherwise use first coach's user_id
      const coachUserId = coachUserIds.length > 0 ? coachUserIds[0] : user.id

      const { data, error } = await adminSupabase
        .from("college_coach_stars")
        .insert({
          coach_user_id: coachUserId,
          athlete_id: athleteId,
          pipeline_stage: pipelineStage || "Committed",
          interest_level: interestLevel || "high",
          notes: notes || `Added by admin - Committed to school ${schoolId}`,
          starred_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error adding prospect:", error)
        return NextResponse.json({ error: "Failed to add prospect" }, { status: 500 })
      }

      return NextResponse.json({ success: true, data, action: "created" })
    }
  } catch (error: any) {
    console.error("Error in add-prospect API:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
