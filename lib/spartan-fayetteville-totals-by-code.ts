import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import { loadCorrectedStripeDonationsForCampaignWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import { buildSpartanPublicSupporterSummary } from "@/lib/spartan-public-supporter-feed"
import { aggregateSpartanByAthlete } from "@/lib/spartan-fayetteville-stripe"

/**
 * Must match the default in Admin → Fundraising (`/api/admin/spartan-donations?days=…`)
 * so parent profile totals match the admin table unless you change the admin lookback.
 * Value is {@link DEFAULT_FUNDRAISING_CAMPAIGN}.`defaultLookbackDays` (single source of truth).
 */
export const FAYETTEVILLE_STRIPE_LOOKBACK_DAYS = DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays

export type FayettevilleCodeStats = {
  totalCents: number
  /** Same as admin “Gifts” = paid checkout count credited to this code */
  giftCount: number
  /** Same as admin “Race signups” */
  raceSignupCount: number
}

export type FayettevilleStripeWindowSnapshot = {
  statsByAthleteCodeLowercase: Map<string, FayettevilleCodeStats>
  grossSessionTotalCents: number
  ncUnitedCommunityFundHubWindowCents: number
}

/**
 * Fayetteville Stripe window: per-code aggregates (coded gifts only) plus **campaign gross** (every paid session).
 * Uses {@link loadCorrectedStripeDonationsForCampaignWindow} so listing hits **Next/Vercel Data Cache**
 * (shared across serverless instances), not only process memory — profile wallet and hub reuse one Stripe pass.
 */
export async function getFayettevilleStripeWindowSnapshot(): Promise<FayettevilleStripeWindowSnapshot> {
  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeSecret) {
    const empty = new Map<string, FayettevilleCodeStats>()
    return { statsByAthleteCodeLowercase: empty, grossSessionTotalCents: 0, ncUnitedCommunityFundHubWindowCents: 0 }
  }

  const donations = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN, null)
  if (!donations) {
    throw new Error("Could not load Stripe campaign window (fundraising totals)")
  }

  const grossSessionTotalCents = donations.reduce((s, d) => s + d.amountCents, 0)
  const ncUnitedCommunityFundHubWindowCents = buildSpartanPublicSupporterSummary(donations).ncUnitedCommunityFundCents

  const agg = aggregateSpartanByAthlete(donations)
  const statsByAthleteCodeLowercase = new Map<string, FayettevilleCodeStats>()
  for (const a of agg) {
    const k = a.athleteCode.trim().toLowerCase()
    statsByAthleteCodeLowercase.set(k, {
      totalCents: a.totalCents,
      giftCount: a.donationCount,
      raceSignupCount: a.raceSignupCount,
    })
  }

  return { statsByAthleteCodeLowercase, grossSessionTotalCents, ncUnitedCommunityFundHubWindowCents }
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
