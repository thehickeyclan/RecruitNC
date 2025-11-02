import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { college, division } = await request.json()

    if (!college || !division) {
      return NextResponse.json({ error: "College and division are required" }, { status: 400 })
    }

    // Update all athletes at the college
    const { data, error } = await supabase.from("athletes").update({ division }).eq("college", college).select("id")

    if (error) {
      console.error("Error updating college division:", error)
      return NextResponse.json({ error: "Failed to update college division" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${data?.length || 0} athletes at ${college} to ${division}`,
      updatedCount: data?.length || 0,
    })
  } catch (error) {
    console.error("Error in update-college-division:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
