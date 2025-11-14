import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, verified_coach, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && !profile?.verified_coach && profile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden - Coach access required" }, { status: 403 })
    }

    const { athleteId, roster_status, roster_notes } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    // Check if entry exists
    const { data: existingStars } = await supabaseAdmin
      .from("college_coach_stars")
      .select("id")
      .eq("athlete_id", athleteId)

    if (existingStars && existingStars.length > 0) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from("college_coach_stars")
        .update({
          roster_status,
          roster_notes: roster_notes || null,
        })
        .eq("athlete_id", athleteId)
        .select()

      if (error) {
        console.error("Error updating roster status:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    } else {
      // Create new entry
      const { data, error } = await supabaseAdmin
        .from("college_coach_stars")
        .insert({
          athlete_id: athleteId,
          coach_user_id: user.id,
          pipeline_stage: "Committed",
          roster_status,
          roster_notes: roster_notes || null,
          starred_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error("Error creating roster status:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error: any) {
    console.error("Error in roster status API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, verified_coach, role")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin && !profile?.verified_coach && profile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden - Coach access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    // Check if entry exists
    const { data: existingStars } = await supabaseAdmin
      .from("college_coach_stars")
      .select("id")
      .eq("athlete_id", athleteId)

    if (existingStars && existingStars.length > 0) {
      // Delete existing
      const { error } = await supabaseAdmin
        .from("college_coach_stars")
        .delete()
        .eq("athlete_id", athleteId)

      if (error) {
        console.error("Error deleting roster entry:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    } else {
      // Create entry with "Left Program" to hide from view
      const { data, error } = await supabaseAdmin
        .from("college_coach_stars")
        .insert({
          athlete_id: athleteId,
          coach_user_id: user.id,
          pipeline_stage: "Committed",
          roster_status: "Left Program",
          roster_notes: "Removed from roster history",
          starred_at: new Date().toISOString(),
        })
        .select()

      if (error) {
        console.error("Error marking as left program:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }
  } catch (error: any) {
    console.error("Error in roster delete API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
