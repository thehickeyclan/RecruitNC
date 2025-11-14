import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { college, division } = await request.json()

    if (!college || !division) {
      return NextResponse.json({ error: "College and division are required" }, { status: 400 })
    }

    console.log(`Updating college "${college}" to division "${division}"`)

    const supabase = createClient()

    // First, try to update in the college_division_mappings table
    const { data: mappingData, error: mappingError } = await supabase
      .from("college_division_mappings")
      .upsert(
        {
          college_name: college,
          division: division,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "college_name",
        },
      )
      .select()

    if (mappingError) {
      console.error("Error updating college_division_mappings:", mappingError)
      // Continue to try updating athletes table
    } else {
      console.log("Successfully updated college_division_mappings:", mappingData)
    }

    // Also update all athletes with this college
    const {
      data: athleteData,
      error: athleteError,
      count,
    } = await supabase
      .from("athletes")
      .update({
        division: division,
        updated_at: new Date().toISOString(),
      })
      .ilike("college", `%${college}%`)

    if (athleteError) {
      console.error("Error updating athletes:", athleteError)
      return NextResponse.json({ error: "Failed to update athletes" }, { status: 500 })
    }

    console.log(`Updated ${count} athletes with college "${college}" to division "${division}"`)

    return NextResponse.json({
      success: true,
      message: `Updated division for "${college}" to "${division}"`,
      athleteCount: count,
      mappingUpdated: !mappingError,
    })
  } catch (error) {
    console.error("Error in update-college-divisions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
