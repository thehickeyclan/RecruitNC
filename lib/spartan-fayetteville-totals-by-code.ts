import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsMap,
} from "@/lib/spartan-credit-corrections"
import { buildSpartanPublicSupporterSummary } from "@/lib/spartan-public-supporter-feed"
import { aggregateSpartanByAthlete, listSpartanFayettevilleDonations } from "@/lib/spartan-fayetteville-stripe"

/**
 * Must match the default in Admin → Fundraising (`/api/admin/spartan-donations?days=120`)
 * so parent profile totals match the admin table unless you change the admin lookback.
 */
export const FAYETTEVILLE_STRIPE_LOOKBACK_DAYS = 120

export type FayettevilleCodeStats = {
  totalCents: number
  /** Same as admin “Gifts” = paid checkout count credited to this code */
  giftCount: number
  /** Same as admin “Race signups” */
  raceSignupCount: number
}

type StripeWindowCache = {
  expiresAt: number
  statsByAthleteCodeLowercase: Map<string, FayettevilleCodeStats>
  /** All paid Fayetteville sessions in window (same as admin `grossSessionTotalCents`). */
  grossSessionTotalCents: number
  /** Pooled NC United fund checkouts (same rules as `/spartan` summary — intentional “no wrestler”). */
  ncUnitedCommunityFund120dCents: number
}
let stripeWindowCache: StripeWindowCache | null = null
/** Keep short: profile + admin must match public /spartan (which lists Stripe every request) for the same 120d window. */
const STRIPE_LIST_CACHE_MS = 0

export type FayettevilleStripeWindowSnapshot = {
  statsByAthleteCodeLowercase: Map<string, FayettevilleCodeStats>
  grossSessionTotalCents: number
  ncUnitedCommunityFund120dCents: number
}

/**
 * Fayetteville Stripe window: per-code aggregates (coded gifts only) plus **campaign gross** (every paid session).
 * Use gross to reconcile Admin → Fundraising totals vs parent-linked-only rollups.
 */
export async function getFayettevilleStripeWindowSnapshot(): Promise<FayettevilleStripeWindowSnapshot> {
  const now = Date.now()
  if (stripeWindowCache && stripeWindowCache.expiresAt > now) {
    return {
      statsByAthleteCodeLowercase: stripeWindowCache.statsByAthleteCodeLowercase,
      grossSessionTotalCents: stripeWindowCache.grossSessionTotalCents,
      ncUnitedCommunityFund120dCents: stripeWindowCache.ncUnitedCommunityFund120dCents,
    }
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    const empty = new Map<string, FayettevilleCodeStats>()
    stripeWindowCache = {
      expiresAt: now + STRIPE_LIST_CACHE_MS,
      statsByAthleteCodeLowercase: empty,
      grossSessionTotalCents: 0,
      ncUnitedCommunityFund120dCents: 0,
    }
    return { statsByAthleteCodeLowercase: empty, grossSessionTotalCents: 0, ncUnitedCommunityFund120dCents: 0 }
  }

  const since = Math.floor((Date.now() - FAYETTEVILLE_STRIPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)
  const raw = await listSpartanFayettevilleDonations(stripe, since)
  const admin = createAdminClient()
  const correctionMap = await fetchSpartanCreditCorrectionsMap(admin)
  const donationsRaw = applySpartanCreditCorrectionsToDonations(raw, correctionMap)
  const grossSessionTotalCents = donationsRaw.reduce((s, d) => s + d.amountCents, 0)
  const ncUnitedCommunityFund120dCents = buildSpartanPublicSupporterSummary(donationsRaw).ncUnitedCommunityFundCents

  const agg = aggregateSpartanByAthlete(donationsRaw)
  const statsByAthleteCodeLowercase = new Map<string, FayettevilleCodeStats>()
  for (const a of agg) {
    const k = a.athleteCode.trim().toLowerCase()
    statsByAthleteCodeLowercase.set(k, {
      totalCents: a.totalCents,
      giftCount: a.donationCount,
      raceSignupCount: a.raceSignupCount,
    })
  }

  stripeWindowCache = {
    expiresAt: now + STRIPE_LIST_CACHE_MS,
    statsByAthleteCodeLowercase,
    grossSessionTotalCents,
    ncUnitedCommunityFund120dCents,
  }
  return { statsByAthleteCodeLowercase, grossSessionTotalCents, ncUnitedCommunityFund120dCents }
}

/**
 * Per–NCU-code stats for the Fayetteville campaign from Stripe, after `spartan_credit_corrections`
 * — same basis as Admin → Fundraising “Totals by athlete”.
 * Keys: `athlete_code` lowercased.
 */
export async function getFayettevilleStatsByAthleteCodeLowercase(): Promise<Map<string, FayettevilleCodeStats>> {
  const { statsByAthleteCodeLowercase } = await getFayettevilleStripeWindowSnapshot()
  return statsByAthleteCodeLowercase
}
