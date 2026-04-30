import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { invalidateFundraisingAthleteEntriesCache, parseNameFromAthleteName } from "@/lib/spartan-fundraising-code"

export const dynamic = "force-dynamic"

const ATHLETE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

const MIGRATION_HINT =
  'Run in Supabase SQL: ALTER TABLE public.spartan_fundraising_athletes ADD COLUMN IF NOT EXISTS athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL;'

/**
 * POST JSON: { athleteId: uuid, ncuCode: "NCU-…-YY" }
 * Upserts `spartan_fundraising_athletes` so the Stripe code maps to the RecruitNC athlete (playbook §1 clears, §2 can link parents).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { athleteId?: string; ncuCode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const athleteId = typeof body.athleteId === "string" ? body.athleteId.trim() : ""
  const rawCode = typeof body.ncuCode === "string" ? body.ncuCode.trim().toUpperCase() : ""
  if (!ATHLETE_UUID_RE.test(athleteId)) {
    return NextResponse.json({ error: "athleteId must be a valid UUID (from admin / view-profile ?id=…)." }, { status: 400 })
  }
  if (!/^NCU-[A-Z0-9]+-\d{2}$/.test(rawCode)) {
    return NextResponse.json({ error: "ncuCode must look like NCU-LAST-YY" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: athlete, error: aerr } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool")
    .eq("id", athleteId)
    .maybeSingle()

  if (aerr || !athlete) {
    return NextResponse.json({ error: aerr?.message || "Athlete not found." }, { status: 404 })
  }

  const gy = athlete.graduationyear
  const gradYear = typeof gy === "number" && Number.isFinite(gy) ? gy : null
  if (gradYear == null) {
    return NextResponse.json(
      { error: "Athlete has no graduationyear — set it on the athlete record first." },
      { status: 400 },
    )
  }

  const parsed = parseNameFromAthleteName(typeof athlete.name === "string" ? athlete.name : "")
  const fn = (parsed?.firstName ?? "").trim() || "Athlete"
  const ln = (parsed?.lastName ?? "").trim() || "Unknown"
  const school = (typeof athlete.highschool === "string" ? athlete.highschool : "").trim().slice(0, 120)

  const row = {
    code: rawCode,
    first_name: fn,
    last_name: ln,
    grad_year: gradYear,
    school: school || null,
    active: true,
    athlete_id: athleteId,
  }

  const { error: upsertErr } = await admin.from("spartan_fundraising_athletes").upsert(row, { onConflict: "code" })

  if (upsertErr) {
    const msg = upsertErr.message || "Upsert failed"
    if (/athlete_id|column|schema/i.test(msg)) {
      return NextResponse.json(
        {
          error: `Database missing athlete_id column on spartan_fundraising_athletes. ${MIGRATION_HINT}`,
          detail: msg,
        },
        { status: 400 },
      )
    }
    console.error("[spartan-fundraising-pin-code]", upsertErr)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  invalidateFundraisingAthleteEntriesCache()

  return NextResponse.json({
    ok: true,
    message: `Pinned ${rawCode} to athlete ${athleteId} (${athlete.name ?? "profile"}). Refresh fundraising.`,
    code: rawCode,
    athleteId,
  })
}
