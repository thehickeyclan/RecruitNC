import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Use absolute URL instead of relative URL
    const { data, error } = await supabase
      .from("athletes")
      .update({ photourl: "https://v0-new-college-commits.vercel.app/wrestler-profile.png" })
      .eq("name", "Hayden Haynes")
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Hayden's image has been updated to use an absolute URL",
      data,
    })
  } catch (error) {
    console.error("Error updating Hayden's image:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Hayden's image",
        error: String(error),
      },
      { status: 500 },
    )
  }
}
