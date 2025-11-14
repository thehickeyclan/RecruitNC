import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Get all athletes
    const { data: athletes, error: fetchError } = await supabase
      .from("athletes")
      .select("*")
      .order("created_at", { ascending: false })

    if (fetchError) {
      throw fetchError
    }

    // Group athletes by name
    const athletesByName: Record<string, any[]> = {}
    athletes?.forEach((athlete) => {
      if (!athletesByName[athlete.name]) {
        athletesByName[athlete.name] = []
      }
      athletesByName[athlete.name].push(athlete)
    })

    // Find duplicates (names with more than one entry)
    const duplicates: Record<string, any[]> = {}
    Object.entries(athletesByName).forEach(([name, athleteList]) => {
      if (athleteList.length > 1) {
        duplicates[name] = athleteList
      }
    })

    // Keep the most recent entry for each duplicate and delete the rest
    const deletedIds: string[] = []
    for (const [name, athleteList] of Object.entries(duplicates)) {
      // Sort by created_at in descending order (most recent first)
      athleteList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Keep the first one (most recent) and delete the rest
      for (let i = 1; i < athleteList.length; i++) {
        const { error: deleteError } = await supabase.from("athletes").delete().eq("id", athleteList[i].id)

        if (!deleteError) {
          deletedIds.push(athleteList[i].id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Duplicate athletes cleaned up",
      duplicatesFound: Object.keys(duplicates).length,
      deletedCount: deletedIds.length,
      deletedIds,
    })
  } catch (error) {
    console.error("Error cleaning up duplicates:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to clean up duplicates",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
