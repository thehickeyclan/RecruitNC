import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { matchRecordId, athleteId } = await request.json()

    if (!matchRecordId || !athleteId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Update the match record to link it to the athlete profile
    const { data, error } = await supabase
      .from("matches")
      .update({ wrestler_id: athleteId })
      .eq("id", matchRecordId)
      .select()

    if (error) {
      console.error("Error linking match to profile:", error)
      return NextResponse.json({ error: "Failed to link match to profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Link match to profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
