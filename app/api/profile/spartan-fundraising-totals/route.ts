import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"

export const dynamic = "force-dynamic"

export type SpartanFundraisingTotalRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  /** True when the athlete is on the roster but we could not map a NCU code (e.g. missing grad year in profile). */
  codeUnavailable?: boolean
}

/**
 * GET: For the signed-in parent, show Fayetteville Spartan donation totals (from `spartan_donations`)
 * per linked athlete, keyed by the same NCU code rules as /spartan checkout.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("athlete_id")
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: linkRows, error: linkError } = await supabase
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", user.id)

  if (linkError && linkError.code !== "42P01") {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  const ids = new Set<string>()
  const aid = (profileRow as { athlete_id?: string | null } | null)?.athlete_id
  if (aid) ids.add(aid)
  for (const r of linkRows ?? []) {
    if ((r as { athlete_id?: string }).athlete_id) ids.add((r as { athlete_id: string }).athlete_id)
  }
  const athleteIds = [...ids]
  if (athleteIds.length === 0) {
    return NextResponse.json({ campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN, athletes: [] as SpartanFundraisingTotalRow[] })
  }

  const { data: nameRows, error: nameError } = await admin.from("athletes").select("id, name").in("id", athleteIds)
  if (nameError) {
    return NextResponse.json({ error: nameError.message }, { status: 500 })
  }
  const nameById = new Map((nameRows ?? []).map((r) => [String((r as { id: string }).id), String((r as { name: string | null }).name ?? "—")]))

  let entries: Awaited<ReturnType<typeof getFundraisingAthleteEntries>>
  try {
    entries = await getFundraisingAthleteEntries(admin)
  } catch (e) {
    console.error("[profile/spartan-fundraising-totals] getFundraisingAthleteEntries", e)
    return NextResponse.json({ error: "Could not load fundraising directory" }, { status: 500 })
  }

  const codeByAthleteId = new Map<string, string>()
  for (const e of entries) {
    if (e.id.startsWith("spartan-fundraising:")) continue
    codeByAthleteId.set(e.id, e.code)
  }

  const codes = athleteIds.map((id) => codeByAthleteId.get(id)).filter((c): c is string => Boolean(c && c.trim()))
  const codeSetLower = new Set(codes.map((c) => c.toLowerCase()))

  let totalByCodeCents = new Map<string, number>()
  if (codeSetLower.size > 0) {
    const codeList = [...new Set(codes.map((c) => c.trim()))]
    const { data: donRows, error: donError } = await admin
      .from("spartan_donations")
      .select("amount_cents, athlete_code, spartan_campaign")
      .eq("status", "paid")
      .in("athlete_code", codeList)

    if (donError) {
      if (donError.code === "42P01") {
        return NextResponse.json({
          campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
          athletes: athleteIds.map((id) => ({
            athleteId: id,
            name: nameById.get(id) ?? "—",
            fundraisingCode: codeByAthleteId.get(id) ?? null,
            totalCents: 0,
            codeUnavailable: !codeByAthleteId.get(id),
          })),
        })
      }
      return NextResponse.json({ error: donError.message }, { status: 500 })
    }

    for (const row of donRows ?? []) {
      const raw = (row as { amount_cents?: number; athlete_code?: string | null; spartan_campaign?: string | null })
      const sc = raw.spartan_campaign
      if (sc && sc !== SPARTAN_FAYETTEVILLE_CAMPAIGN) continue
      const ac = typeof raw.athlete_code === "string" ? raw.athlete_code.trim() : ""
      if (!ac || !codeSetLower.has(ac.toLowerCase())) continue
      const key = ac.toLowerCase()
      const cents = Number(raw.amount_cents) || 0
      totalByCodeCents.set(key, (totalByCodeCents.get(key) ?? 0) + cents)
    }
  }

  const athletes: SpartanFundraisingTotalRow[] = athleteIds.map((id) => {
    const code = codeByAthleteId.get(id) ?? null
    const name = nameById.get(id) ?? "—"
    if (!code) {
      return {
        athleteId: id,
        name,
        fundraisingCode: null,
        totalCents: 0,
        codeUnavailable: true,
      }
    }
    const totalCents = totalByCodeCents.get(code.toLowerCase()) ?? 0
    return { athleteId: id, name, fundraisingCode: code, totalCents, codeUnavailable: false }
  })

  athletes.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
    source: "spartan_donations",
    athletes,
  })
}
