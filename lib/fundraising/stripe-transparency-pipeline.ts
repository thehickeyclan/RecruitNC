import Stripe from "stripe"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchSpartanCreditCorrectionsIndex,
  applySpartanCreditCorrectionsToDonations,
  type SpartanCreditCorrectionsIndex,
} from "@/lib/spartan-credit-corrections"
import {
  listSpartanFayettevilleDonations,
  listSpartanFayettevilleDonationsAllRegisteredCampaigns,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"
import { DEFAULT_FUNDRAISING_CAMPAIGN, type FundraisingCampaignDefinition } from "@/lib/fundraising/campaign-registry"

const STRIPE_DONATION_LIST_CACHE_SECONDS = Math.min(
  600,
  Math.max(60, Number(process.env.RECRUITNC_FUNDRAISING_STRIPE_LIST_CACHE_SECONDS) || 180),
)

/** Stripe-only Profile wallet attribution — mirrors hub logic over a multi-year span (defaults ~15 calendar years). */
function walletStripeLifetimeLookbackDays(): number {
  const raw = Number(process.env.RECRUITNC_FUNDRAISING_WALLET_STRIPE_LOOKBACK_DAYS)
  if (!Number.isFinite(raw) || raw < 366) return 5475
  return Math.floor(Math.min(raw, 7300))
}

/** Extra Stripe Checkout list pagination for lifetime wallet merges (Stripe max 100 sessions/page). */
function walletStripeLifetimeListMaxPages(): number {
  const raw = Number(process.env.RECRUITNC_STRIPE_WALLET_LIST_MAX_PAGES)
  if (!Number.isFinite(raw) || raw < 80) return 400
  return Math.floor(Math.min(raw, 2000))
}

async function loadCorrectedStripeDonationsForCampaignWindowUncached(
  campaign: FundraisingCampaignDefinition,
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null,
): Promise<SpartanFayettevilleDonation[] | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  try {
    const stripe = new Stripe(key)
    const since = Math.floor((Date.now() - campaign.defaultLookbackDays * 86400000) / 1000)
    const [raw, idx] = await Promise.all([
      listSpartanFayettevilleDonations(stripe, since, campaign.stripeCampaignSlug),
      preloadedCorrectionIndex != null
        ? Promise.resolve(preloadedCorrectionIndex)
        : fetchSpartanCreditCorrectionsIndex(createAdminClient()),
    ])
    return applySpartanCreditCorrectionsToDonations(raw, idx)
  } catch (e) {
    console.error("[stripe-transparency-pipeline]", e)
    return null
  }
}

/**
 * Paid Spartan checkouts for the campaign window, with the same credit corrections as `/api/spartan/supporters`.
 * Use for public totals that must match `/spartan` (source of truth is Stripe, not the `spartan_donations` mirror).
 *
 * Pass `preloadedCorrectionIndex` when the caller already loaded corrections (avoids a duplicate Supabase round trip).
 * When `preloadedCorrectionIndex` is null, results are cached briefly (see `RECRUITNC_FUNDRAISING_STRIPE_LIST_CACHE_SECONDS`)
 * so listing all Checkout Sessions is not repeated on every request.
 */
export async function loadCorrectedStripeDonationsForCampaignWindow(
  campaign: FundraisingCampaignDefinition = DEFAULT_FUNDRAISING_CAMPAIGN,
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null = null,
): Promise<SpartanFayettevilleDonation[] | null> {
  if (preloadedCorrectionIndex != null) {
    return loadCorrectedStripeDonationsForCampaignWindowUncached(campaign, preloadedCorrectionIndex)
  }
  const cachedLoader = unstable_cache(
    async () => loadCorrectedStripeDonationsForCampaignWindowUncached(campaign, null),
    [
      "spartan-corrected-stripe-donations",
      campaign.stripeCampaignSlug,
      String(campaign.defaultLookbackDays),
    ],
    { revalidate: STRIPE_DONATION_LIST_CACHE_SECONDS },
  )
  const fromCache = await cachedLoader()
  if (fromCache != null) return fromCache
  /** `unstable_cache` may have stored `null` from a transient Stripe/env failure — bypass cache once. */
  return loadCorrectedStripeDonationsForCampaignWindowUncached(campaign, null)
}

/**
 * **Uncached** paid Spartan checkouts for `campaign.defaultLookbackDays`, with the same corrections as
 * `GET /api/spartan/supporters` when called with `days` equal to `campaign.defaultLookbackDays`.
 * Use for **public athlete gift pages** so raised totals match the Spartan supporter board exactly.
 */
export async function loadCorrectedStripeDonationsForSpartanPublicWindow(
  campaign: FundraisingCampaignDefinition = DEFAULT_FUNDRAISING_CAMPAIGN,
): Promise<SpartanFayettevilleDonation[] | null> {
  return loadCorrectedStripeDonationsForCampaignWindowUncached(campaign, null)
}

async function loadCorrectedStripeDonationsForAllHubCampaignsWindowUncached(
  lookbackDays: number,
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null,
): Promise<SpartanFayettevilleDonation[] | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  try {
    const stripe = new Stripe(key)
    const since = Math.floor((Date.now() - lookbackDays * 86400000) / 1000)
    const [raw, idx] = await Promise.all([
      listSpartanFayettevilleDonationsAllRegisteredCampaigns(stripe, since),
      preloadedCorrectionIndex != null
        ? Promise.resolve(preloadedCorrectionIndex)
        : fetchSpartanCreditCorrectionsIndex(createAdminClient()),
    ])
    return applySpartanCreditCorrectionsToDonations(raw, idx)
  } catch (e) {
    console.error("[stripe-transparency-pipeline] all hub campaigns", e)
    return null
  }
}

/**
 * Paid checkouts for every registry `spartan_campaign` in the lookback window (Stripe + credit corrections).
 * One Checkout list pass; wider metadata filter than {@link loadCorrectedStripeDonationsForCampaignWindow}.
 */
export async function loadCorrectedStripeDonationsForAllHubCampaignsWindow(
  lookbackDays: number,
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null = null,
): Promise<SpartanFayettevilleDonation[] | null> {
  if (preloadedCorrectionIndex != null) {
    return loadCorrectedStripeDonationsForAllHubCampaignsWindowUncached(lookbackDays, preloadedCorrectionIndex)
  }
  const cachedLoader = unstable_cache(
    async () => loadCorrectedStripeDonationsForAllHubCampaignsWindowUncached(lookbackDays, null),
    ["spartan-corrected-stripe-donations-all-hub-campaigns", String(lookbackDays)],
    { revalidate: STRIPE_DONATION_LIST_CACHE_SECONDS },
  )
  const fromCache = await cachedLoader()
  if (fromCache != null) return fromCache
  return loadCorrectedStripeDonationsForAllHubCampaignsWindowUncached(lookbackDays, null)
}

async function loadCorrectedStripeDonationsForWalletLifetimeUncached(
  lookbackDays: number,
  listMaxPages: number,
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null,
): Promise<SpartanFayettevilleDonation[] | null> {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  try {
    const stripe = new Stripe(key)
    const since = Math.floor((Date.now() - lookbackDays * 86400000) / 1000)
    const [raw, idx] = await Promise.all([
      listSpartanFayettevilleDonationsAllRegisteredCampaigns(stripe, since, {
        maxPages: listMaxPages,
      }),
      preloadedCorrectionIndex != null
        ? Promise.resolve(preloadedCorrectionIndex)
        : fetchSpartanCreditCorrectionsIndex(createAdminClient()),
    ])
    return applySpartanCreditCorrectionsToDonations(raw, idx)
  } catch (e) {
    console.error("[stripe-transparency-pipeline] wallet lifetime", e)
    return null
  }
}

/**
 * Long lookback Stripe list (every registered hub campaign) + corrections — single source used with
 * `stripeCheckoutSessionsAttributedToAthlete` for Profile/digital wallet Raised / gift totals.
 *
 * Separate cache key from the hub leaderboard window loader so changing defaultLookbackDays does not poison wallet merges.
 */
export async function loadCorrectedStripeDonationsForWalletLifetime(
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null = null,
): Promise<SpartanFayettevilleDonation[] | null> {
  const lookbackDays = walletStripeLifetimeLookbackDays()
  const listMaxPages = walletStripeLifetimeListMaxPages()

  if (preloadedCorrectionIndex != null) {
    return loadCorrectedStripeDonationsForWalletLifetimeUncached(lookbackDays, listMaxPages, preloadedCorrectionIndex)
  }

  const cachedLoader = unstable_cache(
    async () => loadCorrectedStripeDonationsForWalletLifetimeUncached(lookbackDays, listMaxPages, null),
    [
      "spartan-corrected-stripe-wallet-lifetime",
      String(lookbackDays),
      String(listMaxPages),
    ],
    { revalidate: STRIPE_DONATION_LIST_CACHE_SECONDS },
  )
  const fromCache = await cachedLoader()
  if (fromCache != null) return fromCache
  return loadCorrectedStripeDonationsForWalletLifetimeUncached(lookbackDays, listMaxPages, null)
}
