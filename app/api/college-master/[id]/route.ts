import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const { division } = body
    const collegeId = params.id

    const { data: college, error } = await supabase
      .from("college_master")
      .update({
        division: division,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collegeId)
      .select()
      .single()

    if (error) {
      console.error("Error updating college:", error)
      return NextResponse.json({ error: "Failed to update college" }, { status: 500 })
    }

    return NextResponse.json({ college })
  } catch (error) {
    console.error("Error in update college:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collegeId = params.id

    // Delete aliases first
    await supabase.from("college_aliases").delete().eq("college_id", collegeId)

    // Delete college
    const { error } = await supabase.from("college_master").delete().eq("id", collegeId)

    if (error) {
      console.error("Error deleting college:", error)
      return NextResponse.json({ error: "Failed to delete college" }, { status: 500 })
    }

    return NextResponse.json({ message: "College deleted successfully" })
  } catch (error) {
    console.error("Error in delete college:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 },
    )
  }
}
