import type { SupabaseClient } from "@supabase/supabase-js"
import {
  fetchReimbursementPaidCentsByAthleteIdAllTime,
  fetchReimbursementPaidCentsByAthleteIdInWindow,
  fetchTotalReimbursementPaidCentsAllTime,
} from "@/lib/athlete-reimbursement-net"
import { fetchGuildReservedCentsByAthleteIdGlobal } from "@/lib/guild-credit-allocations"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import { FAYETTEVILLE_STRIPE_LOOKBACK_DAYS, getFayettevilleStatsByAthleteCodeLowercase } from "@/lib/spartan-fayetteville-totals-by-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export type AdminParentAthleteFundRow = {
  athleteId: string
  name: string
  fundraisingCode: string | null
  /** Stripe gifts in Fayetteville lookback window (matches parent Spartan card). */
  raisedCents: number
  giftCount: number
  raceSignupCount: number
  /** Reimbursements marked paid in the same window as raised. */
  reimbursementsPaidWindowCents: number
  /** Reimbursements marked paid, all time (per athlete). */
  reimbursementsPaidAllTimeCents: number
  guildAllocationsCents: number
  /** raised − reimb (window), before Guild. */
  netAfterReimbursementsWindowCents: number
  /** Parent-facing notional: net after window reimb − Guild ledger. */
  remainingNotionalCents: number
  codeUnavailable?: boolean
}

export type AdminParentAthleteFundRollup = {
  campaign: string
  lookbackDays: number
  athletes: AdminParentAthleteFundRow[]
  /** Sums over rows in `athletes` only. */
  totalsForLinkedAthletes: {
    raisedCents: number
    reimbursementsPaidWindowCents: number
    reimbursementsPaidAllTimeCents: number
    guildAllocationsCents: number
    remainingNotionalCents: number
  }
  /** Every paid reimbursement in the system (all athletes), for the “total paid out” tile. */
  globalReimbursementsPaidAllTimeCents: number
}

async function collectAthleteIdsWithParentAssociation(admin: SupabaseClient): Promise<string[]> {
  const ids = new Set<string>()

  const { data: linkRows, error: linkError } = await admin.from("parent_athlete_links").select("athlete_id")
  if (linkError && linkError.code !== "42P01") {
    throw new Error(linkError.message)
  }
  for (const r of linkRows ?? []) {
    const id = (r as { athlete_id?: string | null }).athlete_id
    if (id) ids.add(id)
  }

  const { data: profRows, error: profError } = await admin
    .from("user_profiles")
    .select("athlete_id")
    .not("athlete_id", "is", null)

  if (profError) {
    // 42P01 = missing table; 42703 = missing column (prod may not have user_profiles.athlete_id yet).
    if (profError.code !== "42P01" && profError.code !== "42703") {
      throw new Error(profError.message)
    }
  } else {
    for (const r of profRows ?? []) {
      const id = (r as { athlete_id?: string | null }).athlete_id
      if (id) ids.add(id)
    }
  }

  return [...ids]
}

/**
 * Spartan + reimbursement + Guild rollups for every athlete tied to a parent (`parent_athlete_links`, plus
 * `user_profiles.athlete_id` when that column exists),
 * plus a global “all reimbursements paid” total. Same 120d Stripe window and Guild global ledger as admin fundraising.
 */
export async function fetchAdminParentAthleteFundraisingRollup(): Promise<
  { ok: true; data: AdminParentAthleteFundRollup } | { ok: false; error: string }
> {
  try {
    const admin = createAdminClient()
    const athleteIds = await collectAthleteIdsWithParentAssociation(admin)
    if (athleteIds.length === 0) {
      const globalReimbursementsPaidAllTimeCents = await fetchTotalReimbursementPaidCentsAllTime(admin)
      return {
        ok: true,
        data: {
          campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
          lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
          athletes: [],
          totalsForLinkedAthletes: {
            raisedCents: 0,
            reimbursementsPaidWindowCents: 0,
            reimbursementsPaidAllTimeCents: 0,
            guildAllocationsCents: 0,
            remainingNotionalCents: 0,
          },
          globalReimbursementsPaidAllTimeCents,
        },
      }
    }

    const { data: nameRows, error: nameError } = await admin.from("athletes").select("id, name").in("id", athleteIds)
    if (nameError) {
      return { ok: false, error: nameError.message }
    }
    const nameById = new Map(
      (nameRows ?? []).map((r) => [
        String((r as { id: string }).id),
        String((r as { name: string | null }).name ?? "—"),
      ]),
    )

    const entries = await getFundraisingAthleteEntries(admin)
    const codeByAthleteId = new Map<string, string>()
    for (const e of entries) {
      if (e.id.startsWith("spartan-fundraising:")) continue
      codeByAthleteId.set(e.id, e.code)
    }

    const sinceMs = Date.now() - FAYETTEVILLE_STRIPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000

    let statsByCode = new Map<string, { totalCents: number; giftCount: number; raceSignupCount: number }>()
    try {
      statsByCode = await getFayettevilleStatsByAthleteCodeLowercase()
    } catch (e) {
      console.error("[admin-parent-athlete-rollup] Stripe totals", e)
    }

    const [reimbWindowByAthlete, reimbAllTimeByAthlete, guildByAthlete, globalPaidAllTime] = await Promise.all([
      fetchReimbursementPaidCentsByAthleteIdInWindow(admin, sinceMs),
      fetchReimbursementPaidCentsByAthleteIdAllTime(admin),
      fetchGuildReservedCentsByAthleteIdGlobal(admin),
      fetchTotalReimbursementPaidCentsAllTime(admin),
    ])

    const athletes: AdminParentAthleteFundRow[] = athleteIds.map((id) => {
      const code = codeByAthleteId.get(id) ?? null
      const name = nameById.get(id) ?? "—"
      const paidWindow = reimbWindowByAthlete.get(id) ?? 0
      const paidAllTime = reimbAllTimeByAthlete.get(id) ?? 0
      const guildAlloc = guildByAthlete.get(id) ?? 0

      if (!code) {
        const net = 0 - paidWindow
        return {
          athleteId: id,
          name,
          fundraisingCode: null,
          raisedCents: 0,
          giftCount: 0,
          raceSignupCount: 0,
          reimbursementsPaidWindowCents: paidWindow,
          reimbursementsPaidAllTimeCents: paidAllTime,
          guildAllocationsCents: guildAlloc,
          netAfterReimbursementsWindowCents: net,
          remainingNotionalCents: net - guildAlloc,
          codeUnavailable: true,
        }
      }

      const s = statsByCode.get(code.toLowerCase())
      const raisedCents = s?.totalCents ?? 0
      const net = raisedCents - paidWindow
      return {
        athleteId: id,
        name,
        fundraisingCode: code,
        raisedCents,
        giftCount: s?.giftCount ?? 0,
        raceSignupCount: s?.raceSignupCount ?? 0,
        reimbursementsPaidWindowCents: paidWindow,
        reimbursementsPaidAllTimeCents: paidAllTime,
        guildAllocationsCents: guildAlloc,
        netAfterReimbursementsWindowCents: net,
        remainingNotionalCents: net - guildAlloc,
      }
    })

    athletes.sort((a, b) => a.name.localeCompare(b.name))

    const totalsForLinkedAthletes = athletes.reduce(
      (acc, r) => ({
        raisedCents: acc.raisedCents + r.raisedCents,
        reimbursementsPaidWindowCents: acc.reimbursementsPaidWindowCents + r.reimbursementsPaidWindowCents,
        reimbursementsPaidAllTimeCents: acc.reimbursementsPaidAllTimeCents + r.reimbursementsPaidAllTimeCents,
        guildAllocationsCents: acc.guildAllocationsCents + r.guildAllocationsCents,
        remainingNotionalCents: acc.remainingNotionalCents + r.remainingNotionalCents,
      }),
      {
        raisedCents: 0,
        reimbursementsPaidWindowCents: 0,
        reimbursementsPaidAllTimeCents: 0,
        guildAllocationsCents: 0,
        remainingNotionalCents: 0,
      },
    )

    return {
      ok: true,
      data: {
        campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
        lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
        athletes,
        totalsForLinkedAthletes,
        globalReimbursementsPaidAllTimeCents: globalPaidAllTime,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin-parent-athlete-rollup]", msg)
    return { ok: false, error: msg }
  }
}
