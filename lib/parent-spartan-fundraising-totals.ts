import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchReimbursementPaidCentsByAthleteIdInWindow } from "@/lib/athlete-reimbursement-net"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { FAYETTEVILLE_STRIPE_LOOKBACK_DAYS, getFayettevilleStatsByAthleteCodeLowercase } from "@/lib/spartan-fayetteville-totals-by-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"

export type ParentSpartanFundraisingAthleteRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  netAfterReimbursementsCents: number
  codeUnavailable?: boolean
}

/**
 * Fayetteville Spartan totals per linked athlete for a parent user (same basis as
 * GET /api/profile/spartan-fundraising-totals).
 */
export async function computeParentSpartanFundraisingTotalsForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<{ campaign: string; athletes: ParentSpartanFundraisingAthleteRow[] }> {
  const { data: profileRow } = await admin.from("user_profiles").select("athlete_id").eq("user_id", userId).maybeSingle()

  const { data: linkRows, error: linkError } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("user_id", userId)

  if (linkError && linkError.code !== "42P01") {
    throw new Error(linkError.message)
  }

  const ids = new Set<string>()
  const aid = (profileRow as { athlete_id?: string | null } | null)?.athlete_id
  if (aid) ids.add(aid)
  for (const r of linkRows ?? []) {
    if ((r as { athlete_id?: string }).athlete_id) ids.add((r as { athlete_id: string }).athlete_id)
  }
  const athleteIds = [...ids]
  if (athleteIds.length === 0) {
    return { campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN, athletes: [] }
  }

  const { data: nameRows, error: nameError } = await admin.from("athletes").select("id, name").in("id", athleteIds)
  if (nameError) {
    throw new Error(nameError.message)
  }
  const nameById = new Map(
    (nameRows ?? []).map((r) => [String((r as { id: string }).id), String((r as { name: string | null }).name ?? "—")]),
  )

  const entries = await getFundraisingAthleteEntries(admin)
  const codeByAthleteId = new Map<string, string>()
  for (const e of entries) {
    if (e.id.startsWith("spartan-fundraising:")) continue
    codeByAthleteId.set(e.id, e.code)
  }

  let statsByCode = new Map<string, { totalCents: number; giftCount: number; raceSignupCount: number }>()
  try {
    statsByCode = await getFayettevilleStatsByAthleteCodeLowercase()
  } catch (e) {
    console.error("[parent-spartan-fundraising-totals] Stripe totals", e)
  }

  const sinceMs = Date.now() - FAYETTEVILLE_STRIPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  const reimbByAthleteId = await fetchReimbursementPaidCentsByAthleteIdInWindow(admin, sinceMs)

  const athletes: ParentSpartanFundraisingAthleteRow[] = athleteIds.map((id) => {
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
  return { campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN, athletes }
}
