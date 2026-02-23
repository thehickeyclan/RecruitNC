import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const }
}

/** GET: One Blue signup (registration form) by id — the exact fields they filled out. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ signupId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { signupId } = await params
  if (!signupId) return NextResponse.json({ error: "signupId required" }, { status: 400 })

  const admin = createAdminClient()

  const { data: row, error } = await admin
    .from("blue_signups")
    .select("id, parent_first_name, parent_last_name, parent_email, parent_phone, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, tshirt_size, status, created_at")
    .eq("id", signupId)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: "Signup not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: row.id,
    parent_first_name: (row.parent_first_name ?? "").toString().trim(),
    parent_last_name: (row.parent_last_name ?? "").toString().trim(),
    parent_email: (row.parent_email ?? "").toString().trim(),
    parent_phone: (row.parent_phone ?? "").toString().trim() || null,
    athlete_first_name: (row.athlete_first_name ?? "").toString().trim(),
    athlete_last_name: (row.athlete_last_name ?? "").toString().trim(),
    athlete_graduation_year: row.athlete_graduation_year ?? null,
    athlete_high_school: (row.athlete_high_school ?? "").toString().trim(),
    athlete_wrestling_club: (row.athlete_wrestling_club ?? "").toString().trim() || null,
    athlete_weight_class: (row.athlete_weight_class ?? "").toString().trim() || null,
    tshirt_size: (row.tshirt_size ?? "").toString().trim(),
    status: (row.status ?? "").toString(),
    created_at: (row.created_at ?? "").toString(),
  })
}
