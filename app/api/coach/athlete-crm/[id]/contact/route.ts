import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const athleteId = params.id
    const body = await request.json()

    const { error } = await supabase
      .from("college_coach_stars")
      .update({
        parent_name: body.parent_name,
        parent_phone: body.parent_phone,
        parent_email: body.parent_email,
        athlete_cell: body.athlete_cell,
        athlete_email: body.athlete_email,
        athlete_instagram: body.athlete_instagram,
      })
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)

    if (error) {
      return NextResponse.json({ error: "Failed to update contact info" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating contact info:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
