import Stripe from "stripe"
import {
  FUNDRAISING_CAMPAIGNS,
  fundraisingCampaignByStripeSlug,
} from "@/lib/fundraising/campaign-registry"
import {
  listSpartanFayettevilleDonations,
  publicSupporterDisplayName,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

/** Long window so the honor roll catches historical gifts (Stripe list is capped per campaign by pagination). */
export const DONOR_HALL_OF_FAME_LOOKBACK_DAYS = 5475

/**
 * Minimum **single checkout** amount (cents) to appear on the public recognition list.
 * Adjust if you want $50 ($5_000) or $250, etc.
 */
export const DONOR_RECOGNITION_MIN_AMOUNT_CENTS = 10_000

export type DonorHallOfFameEntry = {
  displayName: string
  /** Campaigns where this donor made a qualifying (≥ min), public-name gift. */
  campaigns: string[]
}

export type DonorHallOfFameData = {
  individuals: DonorHallOfFameEntry[]
  organizations: DonorHallOfFameEntry[]
  minAmountCents: number
}

export type SpartanDonationWithCampaign = SpartanFayettevilleDonation & { campaignStripeSlug: string }

function campaignLabelForStripeSlug(slug: string): string {
  return fundraisingCampaignByStripeSlug(slug)?.campaignDisplayName ?? slug
}

async function mergeSpartanDonationsAllRegistryCampaigns(
  stripe: Stripe,
  sinceUnix: number,
): Promise<SpartanDonationWithCampaign[]> {
  const map = new Map<string, SpartanDonationWithCampaign>()
  for (const c of FUNDRAISING_CAMPAIGNS) {
    const rows = await listSpartanFayettevilleDonations(stripe, sinceUnix, c.stripeCampaignSlug)
    for (const r of rows) {
      map.set(r.sessionId, { ...r, campaignStripeSlug: c.stripeCampaignSlug })
    }
  }
  return [...map.values()].sort((a, b) => b.createdUnix - a.createdUnix)
}

/**
 * Unique display names for donors who chose “show my name” on the public list (`donor_list_public`),
 * with at least one paid checkout ≥ `minAmountCents`. Campaign labels reflect only qualifying checkouts.
 */
export function buildDonorHallOfFameEntries(
  rows: SpartanDonationWithCampaign[],
  target: "person" | "organization",
  minAmountCents: number,
): DonorHallOfFameEntry[] {
  type Agg = { displayName: string; campaigns: Set<string> }
  const byNormKey = new Map<string, Agg>()

  for (const r of rows) {
    if (!r.donorListPublic) continue
    if (r.amountCents < minAmountCents) continue
    if (target === "person") {
      if (r.payerType === "organization") continue
    } else if (r.payerType !== "organization") {
      continue
    }

    const name = publicSupporterDisplayName(r)
    if (name === "Anonymous" || name === "Supporter") continue

    const norm = name.toLowerCase().normalize("NFKC").trim()
    if (!norm) continue

    const label = campaignLabelForStripeSlug(r.campaignStripeSlug)
    const existing = byNormKey.get(norm)
    if (!existing) {
      byNormKey.set(norm, { displayName: name, campaigns: new Set([label]) })
    } else {
      existing.campaigns.add(label)
    }
  }

  return [...byNormKey.values()]
    .map((a) => ({
      displayName: a.displayName,
      campaigns: [...a.campaigns].sort((x, y) => x.localeCompare(y, "en", { sensitivity: "base" })),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }))
}

export async function fetchDonorHallOfFameFromStripe(): Promise<DonorHallOfFameData | null> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) return null
  const stripe = new Stripe(secret)
  const sinceUnix = Math.floor((Date.now() - DONOR_HALL_OF_FAME_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000)
  const rows = await mergeSpartanDonationsAllRegistryCampaigns(stripe, sinceUnix)
  const minAmountCents = DONOR_RECOGNITION_MIN_AMOUNT_CENTS
  return {
    individuals: buildDonorHallOfFameEntries(rows, "person", minAmountCents),
    organizations: buildDonorHallOfFameEntries(rows, "organization", minAmountCents),
    minAmountCents,
  }
}
