import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    console.log("[v0] ===== TOGGLE STAR API CALLED =====")
    const supabase = await createClient()
    const { athleteId } = await request.json()

    console.log("[v0] Athlete ID:", athleteId)

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[v0] User ID:", user?.id)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Checking if athlete is already starred...")

    // Check if already starred
    const { data: existing, error: checkError } = await supabase
      .from("college_coach_stars")
      .select("id")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .maybeSingle()

    console.log("[v0] Existing star check:", { existing, checkError })

    if (existing) {
      // Unstar
      console.log("[v0] Unstarring athlete...")
      const { error } = await supabase.from("college_coach_stars").delete().eq("id", existing.id)

      if (error) {
        console.error("[v0] Error unstarring athlete:", error)
        return NextResponse.json({ error: "Failed to unstar athlete" }, { status: 500 })
      }

      console.log("[v0] Successfully unstarred athlete")
      return NextResponse.json({ isStarred: false })
    } else {
      // Star
      console.log("[v0] Starring athlete...")
      const { data: insertData, error } = await supabase
        .from("college_coach_stars")
        .insert({
          coach_user_id: user.id,
          athlete_id: athleteId,
          starred_at: new Date().toISOString(),
        })
        .select()

      console.log("[v0] Insert result:", { insertData, error })

      if (error) {
        console.error("[v0] Error starring athlete:", error)
        return NextResponse.json({ error: "Failed to star athlete" }, { status: 500 })
      }

      console.log("[v0] Successfully starred athlete")
      return NextResponse.json({ isStarred: true })
    }
  } catch (error) {
    console.error("[v0] Error in toggle-star route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
