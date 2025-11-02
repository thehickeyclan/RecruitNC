import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")

    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("recruiting_notes")
      .select("note")
      .eq("coach_user_id", user.id)
      .eq("athlete_id", athleteId)
      .maybeSingle()

    if (error) {
      console.error("Error fetching note:", error)
      return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 })
    }

    return NextResponse.json({ note: data?.note || "" })
  } catch (error) {
    console.error("Error in note route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
