import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Update all Belmont Abbey records to Division II
    const { data, error } = await supabase
      .from("athletes")
      .update({ division: "NCAA D2" })
      .eq("college", "Belmont Abbey")
      .select()

    if (error) {
      console.error("Error updating Belmont Abbey records:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${data.length} Belmont Abbey records to Division II`,
      updatedRecords: data,
    })
  } catch (error) {
    console.error("Error in fix-belmont-abbey route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
