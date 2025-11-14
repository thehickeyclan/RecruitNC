import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { mapAthleteFromDatabase } from "@/lib/athlete-utils"

export async function GET() {
  try {
    // These are the exact IDs we want to fetch
    // Replace these with the actual IDs from your database if known
    const athleteIds = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      // Add more IDs to increase chances of finding the athletes
    ]

    // Fetch athletes by ID
    const { data: athletesData, error } = await supabase.from("athletes").select("*").in("id", athleteIds)

    if (error) {
      console.error("Error fetching athletes by ID:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map the database results to Athlete objects
    const athletes = athletesData.map(mapAthleteFromDatabase)

    // Log the results for debugging
    console.log(`Found ${athletes.length} athletes by ID`)

    return NextResponse.json({ athletes })
  } catch (error) {
    console.error("Exception in featured athletes by ID API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
