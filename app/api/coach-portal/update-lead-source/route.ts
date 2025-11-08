import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { athleteId, leadSource, leadSubSource, leadSourceDetail, viewAsCoachId } = await request.json()

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID is required" }, { status: 400 })
    }

    const targetCoachId = viewAsCoachId || user.id

    const { data, error } = await supabase
      .from("college_coach_stars")
      .upsert(
        {
          coach_user_id: targetCoachId,
          athlete_id: athleteId,
          lead_source: leadSource || null,
          lead_subsource: leadSubSource || null,
          lead_source_detail: leadSourceDetail || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "coach_user_id,athlete_id" },
      )
      .select()
      .single()

    if (error) {
      console.error("[Lead Source API] Upsert error:", error)
      return NextResponse.json({ error: "Failed to save lead source" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[Lead Source API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

