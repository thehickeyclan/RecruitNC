import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get all athletes
    const { data: athletes, error: fetchError } = await supabase.from("athletes").select("id, name, achievements")

    if (fetchError) {
      console.error("Error fetching athletes:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const fixedAthletes = []
    const errors = []

    // Process each athlete
    for (const athlete of athletes) {
      if (!Array.isArray(athlete.achievements)) {
        continue // Skip if not an array
      }

      let wasFixed = false
      const fixedAchievements = athlete.achievements.map((achievement) => {
        if (typeof achievement === "string" && (achievement.startsWith('"') || achievement.endsWith('"'))) {
          wasFixed = true
          // Remove extra quotes at beginning and end
          return achievement.replace(/^"/, "").replace(/"$/, "")
        }
        return achievement
      })

      if (wasFixed) {
        try {
          const { data: updatedAthlete, error: updateError } = await supabase
            .from("athletes")
            .update({ achievements: fixedAchievements })
            .eq("id", athlete.id)
            .select("id, name, achievements")
            .single()

          if (updateError) {
            console.error(`Error updating athlete ${athlete.id}:`, updateError)
            errors.push({ id: athlete.id, name: athlete.name, error: updateError.message })
          } else {
            fixedAthletes.push({
              id: athlete.id,
              name: athlete.name,
              before: athlete.achievements,
              after: updatedAthlete.achievements,
            })
          }
        } catch (error) {
          console.error(`Error processing athlete ${athlete.id}:`, error)
          errors.push({ id: athlete.id, name: athlete.name, error: String(error) })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed achievements for ${fixedAthletes.length} athletes`,
      fixedAthletes,
      errors,
      totalAthletes: athletes.length,
    })
  } catch (error) {
    console.error("Error in GET /api/debug/fix-all-achievements:", error)
    return NextResponse.json({ error: "Failed to fix achievements" }, { status: 500 })
  }
}
