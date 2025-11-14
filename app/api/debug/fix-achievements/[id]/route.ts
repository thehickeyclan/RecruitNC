import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    if (!id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get the athlete data
    const { data: athlete, error: fetchError } = await supabase.from("athletes").select("*").eq("id", id).single()

    if (fetchError) {
      console.error(`Error fetching athlete data for ID ${id}:`, fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Fix achievements array
    let fixedAchievements = athlete.achievements
    let wasFixed = false

    if (Array.isArray(athlete.achievements)) {
      fixedAchievements = athlete.achievements.map((achievement) => {
        if (typeof achievement === "string" && achievement.startsWith('"')) {
          wasFixed = true
          // Remove the extra quote at the beginning
          return achievement.replace(/^"/, "")
        }
        return achievement
      })
    }

    // Only update if we actually fixed something
    if (wasFixed) {
      const { data: updatedAthlete, error: updateError } = await supabase
        .from("athletes")
        .update({ achievements: fixedAchievements })
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        console.error(`Error updating athlete achievements for ID ${id}:`, updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Achievements fixed successfully",
        before: athlete.achievements,
        after: fixedAchievements,
        athlete: updatedAthlete,
      })
    }

    return NextResponse.json({
      success: true,
      message: "No issues found with achievements",
      achievements: athlete.achievements,
    })
  } catch (error) {
    console.error("Error in GET /api/debug/fix-achievements/[id]:", error)
    return NextResponse.json({ error: "Failed to fix achievements" }, { status: 500 })
  }
}
