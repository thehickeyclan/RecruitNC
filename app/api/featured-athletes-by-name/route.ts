import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { mapAthleteFromDatabase } from "@/lib/athlete-utils"

export async function GET() {
  try {
    // These are the exact names we want to fetch
    const athleteNames = ["Liam Hickey", "Colt Campbell", "Bentley Sly", "Lorenzo Alston"]

    // Fetch athletes by exact name match
    const { data: athletesData, error } = await supabase.from("athletes").select("*").in("name", athleteNames)

    if (error) {
      console.error("Error fetching athletes by name:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map the database results to Athlete objects
    const athletes = athletesData.map(mapAthleteFromDatabase)

    // Log the results for debugging
    console.log(`Found ${athletes.length} athletes by name`)
    console.log(
      "Athletes found:",
      athletes.map((a) => a.name),
    )

    return NextResponse.json({ athletes })
  } catch (error) {
    console.error("Exception in featured athletes by name API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
