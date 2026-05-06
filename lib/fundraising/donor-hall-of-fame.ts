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
 * Minimum **total** paid giving (cents, summed across opt-in checkouts) to appear on the public recognition list.
 */
export const DONOR_RECOGNITION_MIN_AMOUNT_CENTS = 25_000

export type DonorHallOfFameEntry = {
  /** Dedupe key — email when present, else normalized display name (stable for React keys). */
  aggregateKey: string
  displayName: string
  /** Sum of amounts for paid checkouts where the donor opted into the public list. */
  totalAmountCents: number
  /** NC United campaign display names this donor gave through (any amount counted toward `totalAmountCents`). */
  campaigns: string[]
}

export function formatUsdFromCents(cents: number): string {
  const whole = cents % 100 === 0
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
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

function donorAggregateKey(r: SpartanDonationWithCampaign, resolvedPublicName: string): string | null {
  const email = r.donorEmail?.toLowerCase().normalize("NFKC").trim()
  if (email && email.includes("@")) return `e:${email}`
  const norm = resolvedPublicName.toLowerCase().normalize("NFKC").trim()
  if (!norm) return null
  return `n:${norm}`
}

function pickBetterDisplayName(prev: string, next: string): string {
  const p = prev.trim()
  const n = next.trim()
  if (n.length !== p.length) return n.length > p.length ? n : p
  return p.localeCompare(n, "en", { sensitivity: "base" }) <= 0 ? p : n
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
 * Donors who chose “show my name” (`donor_list_public`), aggregated by payer email (fallback: normalized name).
 * Listed when **total** paid gifts ≥ `minTotalAmountCents`. Sorted by total descending.
 */
export function buildDonorHallOfFameEntries(
  rows: SpartanDonationWithCampaign[],
  target: "person" | "organization",
  minTotalAmountCents: number,
): DonorHallOfFameEntry[] {
  type Agg = { displayName: string; totalCents: number; campaigns: Set<string> }
  const byKey = new Map<string, Agg>()

  for (const r of rows) {
    if (!r.donorListPublic) continue
    if (r.amountCents <= 0) continue
    if (target === "person") {
      if (r.payerType === "organization") continue
    } else if (r.payerType !== "organization") {
      continue
    }

    const name = publicSupporterDisplayName(r)
    if (name === "Anonymous" || name === "Supporter") continue

    const aggKey = donorAggregateKey(r, name)
    if (!aggKey) continue

    const label = campaignLabelForStripeSlug(r.campaignStripeSlug)
    const existing = byKey.get(aggKey)
    if (!existing) {
      byKey.set(aggKey, { displayName: name, totalCents: r.amountCents, campaigns: new Set([label]) })
    } else {
      existing.totalCents += r.amountCents
      existing.campaigns.add(label)
      existing.displayName = pickBetterDisplayName(existing.displayName, name)
    }
  }

  return [...byKey.entries()]
    .map(([aggregateKey, a]) => ({
      aggregateKey,
      displayName: a.displayName,
      totalAmountCents: a.totalCents,
      campaigns: [...a.campaigns].sort((x, y) => x.localeCompare(y, "en", { sensitivity: "base" })),
    }))
    .filter((e) => e.totalAmountCents >= minTotalAmountCents)
    .sort(
      (a, b) =>
        b.totalAmountCents - a.totalAmountCents ||
        a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }),
    )
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

/** Single list ranked by total giving — individuals and organizations together. */
export function mergeDonorHallOfFameRanked(
  individuals: DonorHallOfFameEntry[],
  organizations: DonorHallOfFameEntry[],
): ReadonlyArray<DonorHallOfFameEntry & { payerKind: "person" | "organization" }> {
  const merged = [
    ...individuals.map((e) => ({ ...e, payerKind: "person" as const })),
    ...organizations.map((e) => ({ ...e, payerKind: "organization" as const })),
  ]
  merged.sort(
    (a, b) =>
      b.totalAmountCents - a.totalAmountCents ||
      a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }),
  )
  return merged
}
