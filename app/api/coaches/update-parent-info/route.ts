import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { starId, parentInfo } = await request.json()

    if (!starId || !parentInfo) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { error } = await supabase
      .from("college_coach_stars")
      .update({
        parent_name: parentInfo.parent_name,
        parent_phone: parentInfo.parent_phone,
        parent_email: parentInfo.parent_email,
      })
      .eq("id", starId)
      .eq("coach_user_id", user.id)

    if (error) {
      console.error("Error updating parent info:", error)
      return NextResponse.json({ error: "Failed to update parent info" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in update-parent-info API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
