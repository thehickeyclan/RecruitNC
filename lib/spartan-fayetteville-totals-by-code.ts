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

type CacheEntry = { expiresAt: number; map: Map<string, number> }
let stripeListCache: CacheEntry | null = null
const STRIPE_LIST_CACHE_MS = 90_000

/**
 * Paid Fayetteville campaign gifts from Stripe, after `spartan_credit_corrections`
 * — same basis as Admin → Fundraising (not `spartan_donations` alone).
 * Keys: `athlete_code` lowercased → total cents.
 */
export async function getFayettevilleTotalsCentsByAthleteCodeLowercase(): Promise<Map<string, number>> {
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
  const map = new Map<string, number>()
  for (const a of agg) {
    const k = a.athleteCode.trim().toLowerCase()
    map.set(k, a.totalCents)
  }

  stripeListCache = { expiresAt: now + STRIPE_LIST_CACHE_MS, map }
  return map
}
