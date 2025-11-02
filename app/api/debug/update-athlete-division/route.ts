import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { id, division } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    // Update the athlete's division
    const { data, error } = await supabase
      .from("athletes")
      .update({ division })
      .eq("id", id)
      .select("id, name, division")
      .single()

    if (error) {
      console.error("Error updating athlete division:", error)
      return NextResponse.json({ error: "Failed to update athlete division" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${data.name}'s division to ${division}`,
      athlete: data,
    })
  } catch (error) {
    console.error("Error in update-athlete-division:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
