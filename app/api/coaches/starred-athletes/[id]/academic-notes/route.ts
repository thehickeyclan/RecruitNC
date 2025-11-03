import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { academic_notes } = await request.json()
    const athleteId = params.id

    // Update or create star entry with academic notes
    const { data: existingStar } = await supabase
      .from("college_coach_stars")
      .select("id")
      .eq("athlete_id", athleteId)
      .eq("coach_user_id", user.id)
      .single()

    if (existingStar) {
      // Update existing
      const { error } = await supabase
        .from("college_coach_stars")
        .update({ academic_notes })
        .eq("id", existingStar.id)

      if (error) {
        console.error("Error updating academic notes:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Create new star entry
      const { error } = await supabase
        .from("college_coach_stars")
        .insert({
          athlete_id: athleteId,
          coach_user_id: user.id,
          pipeline_stage: "Prospect",
          academic_notes,
          starred_at: new Date().toISOString(),
        })

      if (error) {
        console.error("Error creating star with academic notes:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in academic notes API:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

