import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchReimbursementPaidCentsByAthleteIdInWindow } from "@/lib/athlete-reimbursement-net"
import { fetchGuildReservedCentsByAthleteId } from "@/lib/guild-credit-allocations"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import {
  type FayettevilleCodeStats,
  FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
  getFayettevilleStatsByAthleteCodeLowercase,
} from "@/lib/spartan-fayetteville-totals-by-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"

/**
 * Same athlete UUID can appear twice in fundraising entries (directory-computed NCU vs playbook row with
 * `athlete_id` + collision suffix, e.g. NCU-APONTE-31 vs NCU-APONTEJ-31). Stripe credits the checkout code —
 * pick the candidate that matches paid totals; tie-break favors gift count then longer code (pinned suffix).
 */
function pickBestFundraisingCodeForAthlete(
  candidates: Set<string>,
  statsByCode: Map<string, FayettevilleCodeStats>,
): string | null {
  const list = [...candidates].map((c) => c.trim()).filter(Boolean)
  if (list.length === 0) return null
  if (list.length === 1) return list[0]!

  let best = list[0]!
  let bestS = statsByCode.get(best.toLowerCase())
  let bestTotal = bestS?.totalCents ?? 0
  let bestGifts = bestS?.giftCount ?? 0

  for (let i = 1; i < list.length; i++) {
    const c = list[i]!
    const s = statsByCode.get(c.toLowerCase())
    const total = s?.totalCents ?? 0
    const gifts = s?.giftCount ?? 0
    if (
      total > bestTotal ||
      (total === bestTotal && gifts > bestGifts) ||
      (total === bestTotal && gifts === bestGifts && c.length > best.length)
    ) {
      best = c
      bestTotal = total
      bestGifts = gifts
    }
  }
  return best
}

export type ParentSpartanFundraisingAthleteRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  totalCents: number
  giftCount: number
  raceSignupCount: number
  reimbursementsPaidCents: number
  /** Gifts in window minus reimbursements paid in window (before Guild allocations). */
  netAfterReimbursementsCents: number
  /** Sum of guild_credit_allocations pending + guild_applied for this athlete (parent ledger). */
  guildAllocationsCents: number
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

  /** Same UUID may map to multiple NCU codes — never overwrite arbitrarily (last loop iteration wins). */
  const codesByAthleteId = new Map<string, Set<string>>()
  for (const e of entries) {
    if (e.id.startsWith("spartan-fundraising:")) continue
    const code = typeof e.code === "string" ? e.code.trim() : ""
    if (!code) continue
    const set = codesByAthleteId.get(e.id) ?? new Set<string>()
    set.add(code)
    codesByAthleteId.set(e.id, set)
  }

  let statsByCode = new Map<string, FayettevilleCodeStats>()
  try {
    statsByCode = await getFayettevilleStatsByAthleteCodeLowercase()
  } catch (e) {
    console.error("[parent-spartan-fundraising-totals] Stripe totals", e)
  }

  const codeByAthleteId = new Map<string, string>()
  for (const id of athleteIds) {
    const candidates = codesByAthleteId.get(id)
    const picked = candidates?.size ? pickBestFundraisingCodeForAthlete(candidates, statsByCode) : null
    if (picked) codeByAthleteId.set(id, picked)
  }

  const sinceMs = Date.now() - FAYETTEVILLE_STRIPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  const reimbByAthleteId = await fetchReimbursementPaidCentsByAthleteIdInWindow(admin, sinceMs)

  let guildReservedByAthlete = new Map<string, number>()
  try {
    guildReservedByAthlete = await fetchGuildReservedCentsByAthleteId(admin, userId)
  } catch (e) {
    console.warn("[parent-spartan-fundraising-totals] guild reservations", e)
  }

  const athletes: ParentSpartanFundraisingAthleteRow[] = athleteIds.map((id) => {
    const code = codeByAthleteId.get(id) ?? null
    const name = nameById.get(id) ?? "—"
    const paidOut = reimbByAthleteId.get(id) ?? 0
    const guildAlloc = guildReservedByAthlete.get(id) ?? 0
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
        guildAllocationsCents: guildAlloc,
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
      guildAllocationsCents: guildAlloc,
      codeUnavailable: false,
    }
  })

  athletes.sort((a, b) => a.name.localeCompare(b.name))
  return { campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN, athletes }
}
