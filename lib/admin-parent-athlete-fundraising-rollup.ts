import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchTotalReimbursementPaidCentsAllTime } from "@/lib/athlete-reimbursement-net"
import { buildParentSpartanFundraisingRowsForAthleteIds } from "@/lib/parent-spartan-fundraising-totals"
import {
  toAdminParentAthleteFundRow,
  type AdminParentAthleteFundRow,
} from "@/lib/admin-parent-athlete-wallet-math"
import {
  FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
  getFayettevilleStripeWindowSnapshot,
} from "@/lib/spartan-fayetteville-totals-by-code"
import { SPARTAN_FAYETTEVILLE_CAMPAIGN } from "@/lib/spartan-fayetteville-stripe"
import { createAdminClient } from "@/lib/supabase/admin"

export type { AdminParentAthleteFundRow } from "@/lib/admin-parent-athlete-wallet-math"

export type AdminParentAthleteFundRollup = {
  campaign: string
  lookbackDays: number
  athletes: AdminParentAthleteFundRow[]
  /** Sums over rows in `athletes` only. */
  totalsForLinkedAthletes: {
    raisedCents: number
    hubWindowRaisedCents: number
    reimbursementsPaidAllTimeCents: number
    guildAllocationsCents: number
    remainingNotionalCents: number
  }
  /** Every paid reimbursement in the system (all athletes), for the “total paid out” tile. */
  globalReimbursementsPaidAllTimeCents: number
  /** Sum of paid Fayetteville Checkout sessions in the lookback window (matches Admin → Fundraising gross). */
  fayettevilleGrossHubWindowCents: number
  /** Hub-window gross minus hub-window raised on linked-athlete rows. */
  raisedOutsideLinkedAthleteRowsHubWindowCents: number
  /** Paid reimbursement cents for athletes not appearing in the linked table (still in global total). */
  reimbursementsPaidAllTimeOutsideLinkedRowsCents: number
  /** NC United pooled fund in window (Stripe attribution — expected without parent-athlete rows). */
  ncUnitedCommunityFundHubWindowCents: number
  /** Raised outside linked-athlete rows minus NC United pool; ideally → $0 after links + directory fixes. */
  raisedAthleteAttributedOutsideParentLinksHubWindowCents: number
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
 * plus a global “all reimbursements paid” total. Wallet balances use lifetime gifts and lifetime debits;
 * the campaign lookback remains available only for the separate hub reconciliation figures.
 */
export async function fetchAdminParentAthleteFundraisingRollup(): Promise<
  { ok: true; data: AdminParentAthleteFundRollup } | { ok: false; error: string }
> {
  try {
    const admin = createAdminClient()
    const athleteIds = await collectAthleteIdsWithParentAssociation(admin)
    if (athleteIds.length === 0) {
      const globalReimbursementsPaidAllTimeCents = await fetchTotalReimbursementPaidCentsAllTime(admin)
      let fayettevilleGrossHubWindowCents = 0
      let ncUnitedCommunityFundHubWindowCents = 0
      try {
        const snap = await getFayettevilleStripeWindowSnapshot()
        fayettevilleGrossHubWindowCents = snap.grossSessionTotalCents
        ncUnitedCommunityFundHubWindowCents = snap.ncUnitedCommunityFundHubWindowCents
      } catch (e) {
        console.error("[admin-parent-athlete-rollup] Stripe gross (no linked athletes)", e)
      }
      const raisedOutsideLinkedAthleteRowsHubWindowCents = Math.max(0, fayettevilleGrossHubWindowCents)
      const raisedAthleteAttributedOutsideParentLinksHubWindowCents = Math.max(
        0,
        raisedOutsideLinkedAthleteRowsHubWindowCents - ncUnitedCommunityFundHubWindowCents,
      )
      return {
        ok: true,
        data: {
          campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
          lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
          athletes: [],
          totalsForLinkedAthletes: {
            raisedCents: 0,
            hubWindowRaisedCents: 0,
            reimbursementsPaidAllTimeCents: 0,
            guildAllocationsCents: 0,
            remainingNotionalCents: 0,
          },
          globalReimbursementsPaidAllTimeCents,
          fayettevilleGrossHubWindowCents,
          raisedOutsideLinkedAthleteRowsHubWindowCents,
          reimbursementsPaidAllTimeOutsideLinkedRowsCents: Math.max(0, globalReimbursementsPaidAllTimeCents),
          ncUnitedCommunityFundHubWindowCents,
          raisedAthleteAttributedOutsideParentLinksHubWindowCents,
        },
      }
    }

    const [hubSnapshot, walletRows, globalPaidAllTime] = await Promise.all([
      getFayettevilleStripeWindowSnapshot().catch((e) => {
        console.error("[admin-parent-athlete-rollup] Stripe totals", e)
        return null
      }),
      buildParentSpartanFundraisingRowsForAthleteIds(admin, "admin-expense-rollup", athleteIds, {
        fundraisingProfiles: "any",
      }),
      fetchTotalReimbursementPaidCentsAllTime(admin),
    ])
    const fayettevilleGrossHubWindowCents = hubSnapshot?.grossSessionTotalCents ?? 0
    const ncUnitedCommunityFundHubWindowCents = hubSnapshot?.ncUnitedCommunityFundHubWindowCents ?? 0

    const athletes = walletRows.map(toAdminParentAthleteFundRow)

    athletes.sort((a, b) => a.name.localeCompare(b.name))

    const totalsForLinkedAthletes = athletes.reduce(
      (acc, r) => ({
        raisedCents: acc.raisedCents + r.raisedCents,
        hubWindowRaisedCents: acc.hubWindowRaisedCents + r.hubWindowRaisedCents,
        reimbursementsPaidAllTimeCents: acc.reimbursementsPaidAllTimeCents + r.reimbursementsPaidAllTimeCents,
        guildAllocationsCents: acc.guildAllocationsCents + r.guildAllocationsCents,
        remainingNotionalCents: acc.remainingNotionalCents + r.remainingNotionalCents,
      }),
      {
        raisedCents: 0,
        hubWindowRaisedCents: 0,
        reimbursementsPaidAllTimeCents: 0,
        guildAllocationsCents: 0,
        remainingNotionalCents: 0,
      },
    )

    const raisedOutsideLinkedAthleteRowsHubWindowCents = Math.max(
      0,
      fayettevilleGrossHubWindowCents - totalsForLinkedAthletes.hubWindowRaisedCents,
    )
    const raisedAthleteAttributedOutsideParentLinksHubWindowCents = Math.max(
      0,
      raisedOutsideLinkedAthleteRowsHubWindowCents - ncUnitedCommunityFundHubWindowCents,
    )
    const reimbursementsPaidAllTimeOutsideLinkedRowsCents = Math.max(
      0,
      globalPaidAllTime - totalsForLinkedAthletes.reimbursementsPaidAllTimeCents,
    )

    return {
      ok: true,
      data: {
        campaign: SPARTAN_FAYETTEVILLE_CAMPAIGN,
        lookbackDays: FAYETTEVILLE_STRIPE_LOOKBACK_DAYS,
        athletes,
        totalsForLinkedAthletes,
        globalReimbursementsPaidAllTimeCents: globalPaidAllTime,
        fayettevilleGrossHubWindowCents,
        raisedOutsideLinkedAthleteRowsHubWindowCents,
        reimbursementsPaidAllTimeOutsideLinkedRowsCents,
        ncUnitedCommunityFundHubWindowCents,
        raisedAthleteAttributedOutsideParentLinksHubWindowCents,
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin-parent-athlete-rollup]", msg)
    return { ok: false, error: msg }
  }
}
