import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Get the actual featured athletes from the database
    const { data: athletes, error } = await supabase
      .from("athletes")
      .select("*")
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
