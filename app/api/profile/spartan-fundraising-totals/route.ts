import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchReimbursementPaidCentsByAthleteIdInWindow } from "@/lib/athlete-reimbursement-net"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { FAYETTEVILLE_STRIPE_LOOKBACK_DAYS, getFayettevilleStatsByAthleteCodeLowercase } from "@/lib/spartan-fayetteville-totals-by-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"

export const dynamic = "force-dynamic"

export type SpartanFundraisingTotalRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  /** Paid gifts credited to this code (admin “Gifts” column) */
  giftCount: number
  /** Race / entry path count (admin “Race signups”) */
  raceSignupCount: number
  /** Reimbursements marked paid in the same lookback window as donations (matched to this athlete). */
  reimbursementsPaidCents: number
  /** Donations in window minus reimbursements paid in window for this athlete. */
  netAfterReimbursementsCents: number
  /** True when the athlete is on the roster but we could not map a NCU code (e.g. missing grad year in profile). */
  codeUnavailable?: boolean
}

/**
 * GET: For the signed-in parent, show Fayetteville Spartan donation totals per linked athlete.
 * Same basis as Admin → Fundraising: Stripe paid sessions + `spartan_credit_corrections` (not `spartan_donations` alone).
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

  let statsByCode = new Map<string, { totalCents: number; giftCount: number; raceSignupCount: number }>()
  try {
    statsByCode = await getFayettevilleStatsByAthleteCodeLowercase()
  } catch (e) {
    console.error("[profile/spartan-fundraising-totals] Stripe totals", e)
  }

  const sinceMs = Date.now() - FAYETTEVILLE_STRIPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  const reimbByAthleteId = await fetchReimbursementPaidCentsByAthleteIdInWindow(admin, sinceMs)

  const athletes: SpartanFundraisingTotalRow[] = athleteIds.map((id) => {
    const code = codeByAthleteId.get(id) ?? null
    const name = nameById.get(id) ?? "—"
    const paidOut = reimbByAthleteId.get(id) ?? 0
    if (!code) {
      return {
        athleteId: id,
        name,
        fundraisingCode: null,
        totalCents: 0,
        giftCount: 0,
        raceSignupCount: 0,
        reimbursementsPaidCents: paidOut,
        netAfterReimbursementsCents: 0 - paidOut,
        codeUnavailable: true,
      }
    }
    const s = statsByCode.get(code.toLowerCase())
    const totalCents = s?.totalCents ?? 0
    return {
      athleteId: id,
      name,
      fundraisingCode: code,
      totalCents,
      giftCount: s?.giftCount ?? 0,
      raceSignupCount: s?.raceSignupCount ?? 0,
      reimbursementsPaidCents: paidOut,
      netAfterReimbursementsCents: totalCents - paidOut,
      codeUnavailable: false,
    }
  })

  athletes.sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({
    campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
    source: "stripe_fayetteville_with_corrections",
    lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
    athletes,
  })
}
