import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Update Hayden with a known working image
    const { error } = await supabase
      .from("athletes")
      .update({ photourl: "/wrestler-profile.png" })
      .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's image has been updated to a known working image",
      new_image: "/wrestler-profile.png",
    })
  } catch (error) {
    console.error("Error updating Hayden's image:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
