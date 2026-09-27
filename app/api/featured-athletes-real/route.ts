import { ATHLETE_PUBLIC_COLUMNS } from "@/lib/athlete-public-columns"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get the actual featured athletes from the database
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select(ATHLETE_PUBLIC_COLUMNS)
      .in("name", ["Liam Hickey", "Colt Campbell", "Xavier Wilson"])
      .order("name")

    if (error) {
      console.error("Error fetching featured athletes:", error)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    console.log("Featured athletes from database:", athletes)

    return NextResponse.json({ athletes: athletes || [] })
  } catch (error) {
    console.error("Exception in featured athletes API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
