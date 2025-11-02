import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { college, division } = await request.json()

    if (!college || !division) {
      return NextResponse.json({ error: "College and division are required" }, { status: 400 })
    }

    // Update all athletes at the college
    const { data, error, count } = await supabase
      .from("athletes")
      .update({ division })
      .ilike("college", college)
      .select("id")

    if (error) {
      console.error("Error updating college division:", error)
      return NextResponse.json({ error: "Failed to update college division" }, { status: 500 })
    }

    // Also save this mapping to the college_division_map table
    try {
      // First check if the table exists
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
          // Continue anyway, just won't save the mapping
        }
      }

      // Save the mapping
      if (!checkError || !checkError.message.includes("does not exist")) {
        await supabase.from("college_division_map").upsert(
          {
            college: college.toLowerCase(),
            division,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "college" },
        )
      }
    } catch (error) {
      console.error("Error saving college mapping:", error)
      // Continue anyway, the athlete updates still worked
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${data?.length || 0} athletes at ${college} to ${division}`,
      updatedCount: data?.length || 0,
    })
  } catch (error) {
    console.error("Error in update-college-division-simple:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
