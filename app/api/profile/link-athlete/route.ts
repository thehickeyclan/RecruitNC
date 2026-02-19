import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** POST: Link current user (parent) to an athlete. Body: { athleteId: string }. Inserts parent_athlete_links. */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: { athleteId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const athleteId = body?.athleteId
  if (!athleteId || typeof athleteId !== "string") {
    return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: athlete, error: fetchErr } = await admin
    .from("athletes")
    .select("id, name")
    .eq("id", athleteId)
    .single()
  if (fetchErr || !athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
  }

  // Insert with the user's client so RLS allows it (policy: authenticated can insert where user_id = auth.uid())
  const { error: linkErr } = await supabase.from("parent_athlete_links").upsert(
    { user_id: user.id, athlete_id: athleteId },
    { onConflict: "user_id,athlete_id", ignoreDuplicates: true }
  )
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    athleteId: athlete.id,
    athleteName: athlete.name,
    message: "Linked. They’ll appear under Your athletes.",
  })
}
