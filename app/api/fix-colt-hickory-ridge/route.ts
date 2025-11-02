import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createClient()

    // Update Colt Campbell's high school to match Brady's format
    const { data, error } = await supabase
      .from("athletes")
      .update({ highschool: "Hickory Ridge" })
      .eq("name", "Colt Campbell")
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Updated Colt Campbell's high school to 'Hickory Ridge'",
      data,
    })
  } catch (error) {
    console.error("Error updating Colt Campbell:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
