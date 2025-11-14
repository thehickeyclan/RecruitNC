import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { collegeIds, division } = body

    if (!collegeIds || !Array.isArray(collegeIds) || collegeIds.length === 0) {
      return NextResponse.json({ error: "College IDs are required" }, { status: 400 })
    }

    if (!division) {
      return NextResponse.json({ error: "Division is required" }, { status: 400 })
    }

    const { data: colleges, error } = await supabase
      .from("college_master")
      .update({
        division: division,
        updated_at: new Date().toISOString(),
      })
      .in("id", collegeIds)
      .select()

    if (error) {
      console.error("Error bulk updating colleges:", error)
      return NextResponse.json({ error: "Failed to update colleges" }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully updated ${colleges?.length} colleges`,
      colleges,
    })
  } catch (error) {
    console.error("Error in bulk update colleges:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
