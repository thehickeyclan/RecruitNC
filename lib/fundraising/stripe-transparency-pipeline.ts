import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchSpartanCreditCorrectionsIndex,
  applySpartanCreditCorrectionsToDonations,
  type SpartanCreditCorrectionsIndex,
} from "@/lib/spartan-credit-corrections"
import {
  listSpartanFayettevilleDonations,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"
import { DEFAULT_FUNDRAISING_CAMPAIGN, type FundraisingCampaignDefinition } from "@/lib/fundraising/campaign-registry"

/**
 * Paid Spartan checkouts for the campaign window, with the same credit corrections as `/api/spartan/supporters`.
 * Use for public totals that must match `/spartan` (source of truth is Stripe, not the `spartan_donations` mirror).
 *
 * Pass `preloadedCorrectionIndex` when the caller already loaded corrections (avoids a duplicate Supabase round trip).
 */
export async function loadCorrectedStripeDonationsForCampaignWindow(
  campaign: FundraisingCampaignDefinition = DEFAULT_FUNDRAISING_CAMPAIGN,
  preloadedCorrectionIndex: SpartanCreditCorrectionsIndex | null = null,
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
