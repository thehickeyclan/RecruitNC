import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { collegeMap } = await request.json()

    if (!collegeMap || typeof collegeMap !== "object") {
      return NextResponse.json({ error: "Invalid college map data" }, { status: 400 })
    }

    // First, check if we have a college_division_map table
    const { error: checkError } = await supabase.from("college_division_map").select("*").limit(1)

    // If the table doesn't exist, create it
    if (checkError && checkError.message.includes("does not exist")) {
      const createTableQuery = `
        CREATE TABLE college_division_map (
          id SERIAL PRIMARY KEY,
          college TEXT NOT NULL UNIQUE,
          division TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `

      const { error: createError } = await supabase.rpc("exec", { query: createTableQuery })

      if (createError) {
        console.error("Error creating college_division_map table:", createError)
        return NextResponse.json({ error: "Failed to create mapping table" }, { status: 500 })
      }
    }

    // Save each college-division mapping
    const entries = Object.entries(collegeMap)
    let successCount = 0
    let errorCount = 0

    for (const [college, division] of entries) {
      // Use upsert to insert or update
      const { error } = await supabase.from("college_division_map").upsert(
        {
          college: college.toLowerCase(),
          division,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "college" },
      )

      if (error) {
        console.error(`Error saving mapping for ${college}:`, error)
        errorCount++
      } else {
        successCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${successCount} college mappings. ${errorCount > 0 ? `Failed: ${errorCount}` : ""}`,
    })
  } catch (error) {
    console.error("Error in save-college-division-map:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if the table exists
    const { error: checkError } = await supabase.from("college_division_map").select("*").limit(1)

    if (checkError && checkError.message.includes("does not exist")) {
      return NextResponse.json({ collegeMap: {} })
    }

    // Get all mappings
    const { data, error } = await supabase.from("college_division_map").select("college, division")

    if (error) {
      console.error("Error fetching college division map:", error)
      return NextResponse.json({ error: "Failed to fetch college map" }, { status: 500 })
    }

    // Convert to object
    const collegeMap: Record<string, string> = {}
    data.forEach((item) => {
      collegeMap[item.college] = item.division
    })

    return NextResponse.json({ collegeMap })
  } catch (error) {
    console.error("Error in GET college-division-map:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
