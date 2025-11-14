import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing record ID" }, { status: 400 })
    }

    // Get the record details before deletion for confirmation
    const { data: recordData, error: fetchError } = await supabase
      .from("matches")
      .select("first_name, last_name, season, grade, wins, losses, total_matches")
      .eq("id", id)
      .single()

    if (fetchError) {
      console.error("Error fetching record for deletion:", fetchError)
      return NextResponse.json({ error: "Record not found" }, { status: 404 })
    }

    // Delete the record
    const { error: deleteError } = await supabase.from("matches").delete().eq("id", id)

    if (deleteError) {
      console.error("Error deleting match record:", deleteError)
      return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: `${recordData.first_name} ${recordData.last_name} - ${recordData.season} (${recordData.grade}) - ${recordData.wins}-${recordData.losses} - ${recordData.total_matches} matches`,
    })
  } catch (error) {
    console.error("Delete match record API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
