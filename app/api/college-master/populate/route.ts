import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("Starting college population...")

    // Get all unique colleges from athletes table
    const { data: athletes, error: athletesError } = await supabase
      .from("athletes")
      .select("college")
      .not("college", "is", null)
      .not("college", "eq", "")

    if (athletesError) {
      console.error("Error fetching athletes:", athletesError)
      return NextResponse.json({ error: "Failed to fetch athletes" }, { status: 500 })
    }

    console.log(`Found ${athletes?.length} athlete records`)

    // Get unique college names
    const uniqueColleges = [...new Set(athletes?.map((a) => a.college?.trim()).filter(Boolean))]
    console.log(`Found ${uniqueColleges.length} unique colleges`)

    // Check which colleges already exist in college_master
    const { data: existingColleges, error: existingError } = await supabase.from("college_master").select("name")

    if (existingError) {
      console.error("Error checking existing colleges:", existingError)
      return NextResponse.json({ error: "Failed to check existing colleges" }, { status: 500 })
    }

    const existingNames = new Set(existingColleges?.map((c) => c.name) || [])
    const newColleges = uniqueColleges.filter((name) => !existingNames.has(name))

    console.log(`${newColleges.length} new colleges to add`)

    if (newColleges.length === 0) {
      return NextResponse.json({
        message: "No new colleges to add",
        total: uniqueColleges.length,
        existing: existingNames.size,
        new: 0,
      })
    }

    // Insert new colleges
    const collegeRecords = newColleges.map((name) => ({
      name: name,
      division: null,
      created_at: new Date().toISOString(),
    }))

    const { data: insertedColleges, error: insertError } = await supabase
      .from("college_master")
      .insert(collegeRecords)
      .select()

    if (insertError) {
      console.error("Error inserting colleges:", insertError)
      return NextResponse.json({ error: "Failed to insert colleges" }, { status: 500 })
    }

    console.log(`Successfully inserted ${insertedColleges?.length} colleges`)

    return NextResponse.json({
      message: "Colleges populated successfully",
      total: uniqueColleges.length,
      existing: existingNames.size,
      new: insertedColleges?.length || 0,
      colleges: insertedColleges,
    })
  } catch (error) {
    console.error("Error in populate colleges:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
