import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  applySpartanCreditCorrectionsToDonations,
  fetchSpartanCreditCorrectionsMap,
} from "@/lib/spartan-credit-corrections"
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

type CacheEntry = { expiresAt: number; map: Map<string, FayettevilleCodeStats> }
let stripeListCache: CacheEntry | null = null
/** Keep short: profile + admin must match public /spartan (which lists Stripe every request) for the same 120d window. */
const STRIPE_LIST_CACHE_MS = 0

/**
 * Per–NCU-code stats for the Fayetteville campaign from Stripe, after `spartan_credit_corrections`
 * — same basis as Admin → Fundraising “Totals by athlete”.
 * Keys: `athlete_code` lowercased.
 */
export async function getFayettevilleStatsByAthleteCodeLowercase(): Promise<Map<string, FayettevilleCodeStats>> {
  const now = Date.now()
  if (stripeListCache && stripeListCache.expiresAt > now) {
    return stripeListCache.map
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    return new Map()
  }

  const since = Math.floor((Date.now() - FAYETTEVILLE_STRIPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000)
  const stripe = new Stripe(stripeSecret)
  const raw = await listSpartanFayettevilleDonations(stripe, since)
  const admin = createAdminClient()
  const correctionMap = await fetchSpartanCreditCorrectionsMap(admin)
  const donationsRaw = applySpartanCreditCorrectionsToDonations(raw, correctionMap)
  const agg = aggregateSpartanByAthlete(donationsRaw)
  const map = new Map<string, FayettevilleCodeStats>()
  for (const a of agg) {
    const k = a.athleteCode.trim().toLowerCase()
    map.set(k, {
      totalCents: a.totalCents,
      giftCount: a.donationCount,
      raceSignupCount: a.raceSignupCount,
    })
  }

  stripeListCache = { expiresAt: now + STRIPE_LIST_CACHE_MS, map }
  return map
}
