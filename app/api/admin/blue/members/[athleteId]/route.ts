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

/** Normalize name for matching: "First Last" and "First", "Last" */
function normalizeName(first: string | null, last: string | null): string {
  const f = (first ?? "").trim()
  const l = (last ?? "").trim()
  return `${f} ${l}`.trim().toLowerCase() || ""
}

/** GET: One Blue member — athlete + membership(s) + payer + matching signup form (what they filled out). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { athleteId } = await params
  if (!athleteId) return NextResponse.json({ error: "athleteId required" }, { status: 400 })

  const admin = createAdminClient()

  const { data: athlete, error: athleteError } = await admin
    .from("athletes")
    .select("id, name, highschool, graduationyear, weightclass, wrestlingclub, wrestling_club")
    .eq("id", athleteId)
    .single()

  if (athleteError || !athlete) {
    return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
  }

  const { data: membershipRows } = await admin
    .from("blue_memberships")
    .select("id, payer_user_id, status, started_at, tshirt_size, created_at, stripe_subscription_id")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })

  const memberships = membershipRows ?? []
  const payerIds = [...new Set(memberships.map((m) => m.payer_user_id))]

  let payer: { name: string; email: string | null; cell_phone: string | null } = { name: "—", email: null, cell_phone: null }
  if (payerIds.length > 0) {
    const { data: profileRow } = await admin
      .from("user_profiles")
      .select("user_id, full_name, first_name, last_name, email, cell_phone")
      .eq("user_id", payerIds[0])
      .maybeSingle()
    if (profileRow) {
      const row = profileRow as Record<string, unknown>
      const name = String(row.full_name ?? "").trim() || [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || "—"
      payer = {
        name,
        email: (row.email as string) ?? null,
        cell_phone: (row.cell_phone as string) ?? null,
      }
    }
  }

  const athleteNameNorm = (athlete.name ?? "").toString().trim().toLowerCase()
  const gradYear = athlete.graduationyear != null ? Number(athlete.graduationyear) : null
  const highSchool = (athlete.highschool ?? "").toString().trim().toLowerCase()

  const { data: signupRows } = await admin
    .from("blue_signups")
    .select("id, parent_first_name, parent_last_name, parent_email, parent_phone, athlete_first_name, athlete_last_name, athlete_graduation_year, athlete_high_school, athlete_wrestling_club, athlete_weight_class, tshirt_size, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500)

  let signup: typeof signupRows extends (infer R)[] ? R : null = null
  if (signupRows?.length) {
    for (const s of signupRows) {
      const signupName = normalizeName(s.athlete_first_name, s.athlete_last_name)
      const matchName = !athleteNameNorm || !signupName || signupName === athleteNameNorm || athleteNameNorm.includes(signupName) || signupName.includes(athleteNameNorm)
      const matchGrad = gradYear == null || s.athlete_graduation_year === gradYear
      const signupSchool = (s.athlete_high_school ?? "").toString().trim().toLowerCase()
      const matchSchool = !highSchool || !signupSchool || signupSchool === highSchool || highSchool.includes(signupSchool) || signupSchool.includes(highSchool)
      if (matchName && matchGrad && matchSchool) {
        signup = s
        break
      }
    }
  }

  const club = (athlete.wrestlingclub ?? athlete.wrestling_club ?? "").toString().trim() || null
  const mem = memberships[0]

  return NextResponse.json({
    athlete: {
      id: athlete.id,
      name: athlete.name ?? "—",
      high_school: (athlete.highschool ?? "").toString() || "—",
      graduation_year: gradYear,
      weight_class: (athlete.weightclass ?? "").toString() || "—",
      wrestling_club: club ?? "—",
    },
    memberships: memberships.map((m) => ({
      id: m.id,
      status: m.status,
      started_at: m.started_at,
      tshirt_size: m.tshirt_size ?? null,
      created_at: m.created_at,
      stripe_subscription_id: m.stripe_subscription_id ?? null,
    })),
    payer,
    signup: signup
      ? {
          parent_first_name: (signup.parent_first_name ?? "").toString().trim() || "—",
          parent_last_name: (signup.parent_last_name ?? "").toString().trim() || "—",
          parent_email: (signup.parent_email ?? "").toString().trim() || "—",
          parent_phone: (signup.parent_phone ?? "").toString().trim() || "—",
          athlete_first_name: (signup.athlete_first_name ?? "").toString().trim() || "—",
          athlete_last_name: (signup.athlete_last_name ?? "").toString().trim() || "—",
          athlete_graduation_year: signup.athlete_graduation_year ?? "—",
          athlete_high_school: (signup.athlete_high_school ?? "").toString().trim() || "—",
          athlete_wrestling_club: (signup.athlete_wrestling_club ?? "").toString().trim() || "—",
          athlete_weight_class: (signup.athlete_weight_class ?? "").toString().trim() || "—",
          tshirt_size: (signup.tshirt_size ?? "").toString().trim() || "—",
          status: (signup.status ?? "").toString(),
          created_at: (signup.created_at ?? "").toString(),
        }
      : null,
    fallback: !signup
      ? {
          parent_name: payer.name,
          parent_email: payer.email ?? "—",
          parent_phone: payer.cell_phone ?? "—",
          athlete_name: athlete.name ?? "—",
          high_school: (athlete.highschool ?? "").toString() || "—",
          graduation_year: gradYear ?? "—",
          weight_class: (athlete.weightclass ?? "").toString() || "—",
          wrestling_club: club ?? "—",
          tshirt_size: (mem?.tshirt_size ?? "").toString() || "—",
        }
      : null,
  })
}
