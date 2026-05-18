import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * POST: Remove a row from `parent_athlete_links` for the signed-in user.
 * Does not change `user_profiles.athlete_id` — fix that on Account if this athlete is your profile primary.
 */
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

  const athleteId = typeof body?.athleteId === "string" ? body.athleteId.trim() : ""
  if (!athleteId) {
    return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing, error: selErr } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  if (selErr && selErr.code !== "42P01") {
    console.error("[profile/unlink-athlete]", selErr)
    return NextResponse.json({ error: selErr.message }, { status: 500 })
  }

  if (!existing) {
    return NextResponse.json(
      {
        error:
          "No Family link found for this athlete (they may only be listed from your Account tab athlete — change or clear that on Account).",
      },
      { status: 404 },
    )
  }

  const { error: delErr } = await admin
    .from("parent_athlete_links")
    .delete()
    .eq("user_id", user.id)
    .eq("athlete_id", athleteId)

  if (delErr) {
    console.error("[profile/unlink-athlete] delete", delErr)
    return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message:
      "Removed this athlete from your linked family. They disappear from your digital wallet unless they are still your Account-tab athlete.",
  })
}
