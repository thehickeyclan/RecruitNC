import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Get colleges without divisions
    const { data: unmappedColleges, error } = await supabase
      .from("college_master")
      .select("*")
      .is("division", null)
      .order("name")

    if (error) {
      console.error("Error fetching unmapped colleges:", error)
      return NextResponse.json({ error: "Failed to fetch unmapped colleges" }, { status: 500 })
    }

    return NextResponse.json({ colleges: unmappedColleges || [] })
  } catch (error) {
    console.error("Error in unmapped colleges:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
