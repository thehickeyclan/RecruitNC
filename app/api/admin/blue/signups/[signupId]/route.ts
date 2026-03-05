import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { athleteEnrichmentFromSignup } from "@/lib/blue-signup-enrich-athlete"

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
    .select("id, parent_first_name, parent_last_name, parent_email, parent_phone, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, athlete_cell_phone, athlete_email, athlete_gpa, highest_achievement, tshirt_size, status, created_at")
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
    athlete_cell_phone: (row.athlete_cell_phone ?? "").toString().trim() || null,
    athlete_email: (row.athlete_email ?? "").toString().trim() || null,
    athlete_gpa: (row.athlete_gpa ?? "").toString().trim() || null,
    highest_achievement: (row.highest_achievement ?? "").toString().trim() || null,
    tshirt_size: (row.tshirt_size ?? "").toString().trim(),
    status: (row.status ?? "").toString(),
    created_at: (row.created_at ?? "").toString(),
  })
}

/** POST: Enrich athlete profile from this signup (cell, email, GPA, club, highest achievement). Finds athlete by name + grad year + school. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ signupId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { signupId } = await params
  if (!signupId) return NextResponse.json({ error: "signupId required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: signup, error: signupErr } = await admin
    .from("blue_signups")
    .select("athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_cell_phone, athlete_email, athlete_gpa, athlete_wrestling_club, athlete_weight_class, highest_achievement")
    .eq("id", signupId)
    .single()

  if (signupErr || !signup) {
    return NextResponse.json({ error: "Signup not found" }, { status: 404 })
  }

  const gradYear = Number((signup as { athlete_graduation_year?: number }).athlete_graduation_year)
  const athleteName = [
    (signup as { athlete_first_name?: string }).athlete_first_name,
    (signup as { athlete_last_name?: string }).athlete_last_name,
  ].filter(Boolean).join(" ").trim()
  const highSchool = ((signup as { athlete_high_school?: string }).athlete_high_school ?? "").trim()

  if (!athleteName || !Number.isFinite(gradYear) || gradYear < 2020 || gradYear > 2040) {
    return NextResponse.json({ error: "Signup missing athlete name or valid graduation year" }, { status: 400 })
  }

  const existingAthlete = await findExistingAthlete(admin, {
    name: athleteName,
    graduationYear: gradYear,
    school: highSchool,
  })

  if (!existingAthlete) {
    return NextResponse.json(
      { error: "No matching athlete found. Create an athlete with this name, graduation year, and high school first, then try again." },
      { status: 404 }
    )
  }

  const enrichment = athleteEnrichmentFromSignup(signup as import("@/lib/blue-signup-enrich-athlete").BlueSignupRow)
  const columns = await getAthletesColumnNames(admin)
  const updatePayload = filterPayloadToSchema({ ...enrichment, updated_at: new Date().toISOString() }, columns)
  if (Object.keys(updatePayload).length <= 1) {
    return NextResponse.json({ message: "No enrichment fields to apply", athleteId: existingAthlete.id })
  }

  const { error: updateErr } = await admin.from("athletes").update(updatePayload).eq("id", existingAthlete.id)
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: "Athlete profile updated with signup data (cell, email, GPA, club, etc.).",
    athleteId: existingAthlete.id,
  })
}
