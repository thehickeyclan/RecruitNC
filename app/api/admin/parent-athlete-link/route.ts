import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin required" }
  return { ok: true }
}

/**
 * POST: Staff inserts parent_athlete_links so the parent can manage Fundraise / Family for this athlete.
 * Body: { athleteId: uuid, parentUserId: uuid } — resolve parent account via Admin → user search first.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { athleteId?: string; parentUserId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const athleteId = typeof body.athleteId === "string" ? body.athleteId.trim() : ""
  const parentUserId = typeof body.parentUserId === "string" ? body.parentUserId.trim() : ""
  if (!athleteId || !parentUserId) {
    return NextResponse.json({ error: "athleteId and parentUserId are required." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: athlete, error: athleteErr } = await admin.from("athletes").select("id, name").eq("id", athleteId).maybeSingle()
  if (athleteErr || !athlete) {
    return NextResponse.json({ error: "Athlete not found." }, { status: 404 })
  }

  const { data: existingLink } = await admin
    .from("parent_athlete_links")
    .select("id")
    .eq("user_id", parentUserId)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  if (existingLink) {
    return NextResponse.json({
      success: true,
      message: `Already linked — ${athlete.name ?? athleteId} is tied to this parent account.`,
      athleteId,
      parentUserId,
    })
  }

  const { error: insertErr } = await admin.from("parent_athlete_links").insert({
    user_id: parentUserId,
    athlete_id: athleteId,
  })

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({
        success: true,
        message: `Already linked — ${athlete.name ?? athleteId} is tied to this parent account.`,
        athleteId,
        parentUserId,
      })
    }
    console.error("[admin/parent-athlete-link]", insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Linked ${athlete.name ?? athleteId} to the selected parent — they’ll see this wrestler under Profile → Family & athletes.`,
    athleteId,
    parentUserId,
  })
}
