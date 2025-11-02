import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Get all athletes for the dropdown
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("id, name, highschool")
      .order("name")

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    // Get unique high schools for the dropdown
    const { data: highSchoolData, error: schoolsError } = await supabase
      .from("athletes")
      .select("highschool")
      .not("highschool", "is", null)

    if (schoolsError) {
      console.error("Error fetching high schools:", schoolsError)
      return NextResponse.json({ error: "Failed to fetch high schools" }, { status: 500 })
    }

    // Extract unique high school names
    const highSchools = [...new Set(highSchoolData.map((item) => item.highschool))].filter(Boolean).sort()

    return NextResponse.json({
      athletes: athletes || [],
      highSchools: highSchools || [],
    })
  } catch (error) {
    console.error("Error in system-data route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
