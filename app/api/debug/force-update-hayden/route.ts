import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Update Hayden's photourl to use the local image
    const { data, error } = await supabase
      .from("athletes")
      .update({ photourl: "/wrestler-profile.png" })
      .eq("name", "Hayden Haynes")
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's image updated successfully",
      data,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
