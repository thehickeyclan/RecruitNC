import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** PATCH: Link WIQ row to athlete (manual match). Body: { athleteId: string | null } */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  let body: { athleteId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const athleteId = body.athleteId === null || body.athleteId === "" ? null : String(body.athleteId)
  const admin = createAdminClient()

  if (athleteId) {
    const { data: athlete } = await admin.from("athletes").select("id").eq("id", athleteId).maybeSingle()
    if (!athlete) return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
  }

  const { data, error } = await admin
    .from("blue_wiq_subscriptions")
    .update({
      athlete_id: athleteId,
      match_confidence: athleteId ? "manual" : "unmatched",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, athlete_id, wrestler_name")
    .single()

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ error: "WIQ table not created yet" }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, row: data })
}
