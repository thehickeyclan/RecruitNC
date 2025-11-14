import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile || (profile.role !== "college_coach" && profile.role !== "coach" && !profile.is_admin)) {
      return NextResponse.json({ error: "Forbidden - Coach access required" }, { status: 403 })
    }

    // Get watch list with athlete details
    const { data: watchList, error } = await supabase
      .from("college_coach_stars")
      .select(
        `
        id,
        athlete_id,
        starred_at,
        notes,
        interest_level,
        pipeline_stage,
        last_contacted,
        athletes (
          id,
          name,
          highschool,
          graduationyear,
          weightclass,
          photourl,
          prospect_ranking,
          college,
          division
        )
      `,
      )
      .eq("coach_user_id", user.id)
      .order("starred_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching watch list:", error)
      return NextResponse.json({ error: "Failed to fetch watch list" }, { status: 500 })
    }

    return NextResponse.json({ success: true, watchList })
  } catch (error: any) {
    console.error("[v0] Watch list API error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role, is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile || (profile.role !== "college_coach" && profile.role !== "coach" && !profile.is_admin)) {
      return NextResponse.json({ error: "Forbidden - Coach access required" }, { status: 403 })
    }

    const { athleteId, notes, interestLevel, pipelineStage } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("college_coach_stars")
      .insert({
        coach_user_id: user.id,
        athlete_id: athleteId,
        notes: notes || null,
        interest_level: interestLevel || "Interested",
        pipeline_stage: pipelineStage || "Prospect",
        starred_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Athlete already in watch list" }, { status: 409 })
      }
      console.error("[v0] Error adding to watch list - Full error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        athleteId,
        userId: user.id,
      })
      return NextResponse.json(
        {
          error: "Failed to add to watch list",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("[v0] Watch list POST error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Remove from watch list
    const { error } = await supabase
      .from("college_coach_stars")
      .delete()
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)

    if (error) {
      console.error("[v0] Error removing from watch list:", error)
      return NextResponse.json({ error: "Failed to remove from watch list" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Watch list DELETE error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
