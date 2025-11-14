import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { photourl } = await request.json()

    if (!photourl) {
      return NextResponse.json({ error: "Missing photourl parameter" }, { status: 400 })
    }

    // Update Hayden's record with the new photourl
    const { data, error } = await supabase.from("athletes").update({ photourl }).eq("name", "Hayden Haynes").select()

    if (error) {
      console.error("Error updating Hayden's image:", error)
      return NextResponse.json({ error: "Failed to update image" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Hayden's image updated successfully",
      data,
    })
  } catch (error) {
    console.error("Exception in update-hayden API:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
