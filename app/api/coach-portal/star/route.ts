import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[v0] Star API - User:", user?.id, user?.email)

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).maybeSingle()

    console.log("[v0] Star API - Full profile:", JSON.stringify(profile))

    const isAdmin =
      profile?.role === "admin" ||
      profile?.is_admin === true ||
      user.email === "thehickeyclan@gmail.com" || // Hardcode admin emails as fallback
      user.email === "cpalmer@goldgroupinc.com"

    const isCoach = profile?.verified_coach === true || profile?.role === "coach" || profile?.role === "college_coach"

    console.log("[v0] Star API - Auth check:", {
      isAdmin,
      isCoach,
      role: profile?.role,
      verified_coach: profile?.verified_coach,
      is_admin: profile?.is_admin,
      email: user.email,
    })

    if (!isAdmin && !isCoach) {
      console.log("[v0] Star API - AUTHORIZATION FAILED - Profile:", profile)
      return NextResponse.json(
        {
          error: "Admin or verified coach access required",
          debug: {
            role: profile?.role,
            is_admin: profile?.is_admin,
            verified_coach: profile?.verified_coach,
            email: user.email,
          },
        },
        { status: 403 },
      )
    }

    const { athleteId, notes, interestLevel } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Check if already starred
    const { data: existingStar } = await supabase
      .from("college_coach_stars")
      .select("id")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .single()

    if (existingStar) {
      // Remove star
      const { error } = await supabase.from("college_coach_stars").delete().eq("id", existingStar.id)

      if (error) {
        console.error("[v0] Error removing star:", JSON.stringify(error, null, 2))
        return NextResponse.json(
          {
            error: "Failed to remove star",
            details: error.message,
            code: error.code,
          },
          { status: 500 },
        )
      }

      console.log("[v0] Star removed successfully")
      return NextResponse.json({ success: true, action: "removed" })
    } else {
      const insertData = {
        coach_user_id: user.id,
        athlete_id: athleteId,
      }
      console.log("[v0] Attempting to insert star:", JSON.stringify(insertData, null, 2))

      const { error } = await supabase.from("college_coach_stars").insert(insertData)

      if (error) {
        console.error("[v0] Error adding star:", JSON.stringify(error, null, 2))
        return NextResponse.json(
          {
            error: "Failed to add star",
            details: error.message,
            code: error.code,
            hint: error.hint,
          },
          { status: 500 },
        )
      }

      console.log("[v0] Star added successfully")
      return NextResponse.json({ success: true, action: "added" })
    }
  } catch (error) {
    console.error("[v0] Coach star API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
