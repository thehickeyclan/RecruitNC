import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { division } = body

    console.log("=== UPDATE REQUEST ===")
    console.log("ID:", id)
    console.log("New Division:", division)
    console.log("Request Body:", body)

    if (!division) {
      return NextResponse.json({ error: "Division is required" }, { status: 400 })
    }

    const supabase = createClient()

    // First, check if the record exists
    const { data: existingRecord, error: fetchError } = await supabase
      .from("college_division_mappings")
      .select("*")
      .eq("id", id)
      .single()

    console.log("Existing record:", existingRecord)
    console.log("Fetch error:", fetchError)

    if (fetchError) {
      console.error("Error fetching existing record:", fetchError)
      return NextResponse.json({ error: `Record not found: ${fetchError.message}` }, { status: 404 })
    }

    // Update the record
    const { data: updatedRecord, error: updateError } = await supabase
      .from("college_division_mappings")
      .update({
        division: division,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    console.log("Updated record:", updatedRecord)
    console.log("Update error:", updateError)

    if (updateError) {
      console.error("Error updating record:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Verify the update worked
    const { data: verifyRecord, error: verifyError } = await supabase
      .from("college_division_mappings")
      .select("*")
      .eq("id", id)
      .single()

    console.log("Verification record:", verifyRecord)
    console.log("Verify error:", verifyError)

    // Also update athletes with this college
    if (updatedRecord.college_name) {
      console.log(`Updating athletes for college: ${updatedRecord.college_name}`)

      const { data: athleteUpdate, error: athleteError } = await supabase
        .from("athletes")
        .update({
          division: division,
          updated_at: new Date().toISOString(),
        })
        .ilike("college", `%${updatedRecord.college_name}%`)
        .select("id, name, college")

      console.log("Updated athletes:", athleteUpdate)
      console.log("Athlete update error:", athleteError)
    }

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      verification: verifyRecord,
      message: `Successfully updated "${updatedRecord.college_name}" to "${division}"`,
    })
  } catch (error) {
    console.error("=== UPDATE ERROR ===", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
