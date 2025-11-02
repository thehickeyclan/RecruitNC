import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Update Gardner-Webb athletes to have correct division
    const { data: updated, error } = await supabase
      .from("athletes")
      .update({ division: "NCAA D2" })
      .eq("college", "Gardner-Webb University")
      .select("id, name, college, division")

    if (error) {
      console.error("Error updating Gardner-Webb division:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated?.length || 0} Gardner-Webb athletes to NCAA D2`,
      updated: updated,
    })
  } catch (error) {
    console.error("Error in fix-gardner-webb-division:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
