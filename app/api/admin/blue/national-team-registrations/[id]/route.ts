import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** PATCH: update record (e.g. "5-2") for a registration. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!id?.trim()) return NextResponse.json({ error: "missing id" }, { status: 400 })

  let body: { record?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const record = typeof body.record === "string" ? body.record.trim() : null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("national_team_event_registrations")
    .update({ record: record || null, updated_at: new Date().toISOString() })
    .eq("id", id.trim())
    .select("id, record")
    .single()

  if (error) {
    if ((error as { code?: string })?.code === "42P01") {
      return NextResponse.json(
        { error: "Table or column may not exist. Run scripts/208 (add record column) if needed." },
        { status: 503 }
      )
    }
    console.error("[admin/blue/national-team-registrations PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, registration: data })
}
