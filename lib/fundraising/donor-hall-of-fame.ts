import Stripe from "stripe"
import { FUNDRAISING_CAMPAIGNS } from "@/lib/fundraising/campaign-registry"
import {
  listSpartanFayettevilleDonations,
  publicSupporterDisplayName,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

/** Long window so the honor roll catches historical gifts (Stripe list is capped per campaign by pagination). */
export const DONOR_HALL_OF_FAME_LOOKBACK_DAYS = 5475

export type DonorHallOfFameData = {
  individuals: string[]
  organizations: string[]
}

async function mergeSpartanDonationsAllRegistryCampaigns(
  stripe: Stripe,
  sinceUnix: number,
): Promise<SpartanFayettevilleDonation[]> {
  const map = new Map<string, SpartanFayettevilleDonation>()
  for (const c of FUNDRAISING_CAMPAIGNS) {
    const rows = await listSpartanFayettevilleDonations(stripe, sinceUnix, c.stripeCampaignSlug)
    for (const r of rows) map.set(r.sessionId, r)
  }
  return [...map.values()].sort((a, b) => b.createdUnix - a.createdUnix)
}

/**
 * Unique display names for donors who chose “show my name” on the public list (`donor_list_public`).
 * No amounts or emails. Splits individuals vs organizations via Stripe `payer_type` metadata.
 */
export function buildDonorHallOfFameLists(
  rows: SpartanFayettevilleDonation[],
  target: "person" | "organization",
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of rows) {
    if (!r.donorListPublic) continue
    if (target === "person") {
      if (r.payerType === "organization") continue
    } else {
      if (r.payerType !== "organization") continue
    }
    const name = publicSupporterDisplayName(r)
    if (name === "Anonymous" || name === "Supporter") continue
    const key = name.toLowerCase().normalize("NFKC").trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  out.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
  return out
}

export async function fetchDonorHallOfFameFromStripe(): Promise<DonorHallOfFameData | null> {
  const secret = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret) return null
  const stripe = new Stripe(secret)
  const sinceUnix = Math.floor((Date.now() - DONOR_HALL_OF_FAME_LOOKBACK_DAYS * 24 * 60 * 60 * 1000) / 1000)
  const rows = await mergeSpartanDonationsAllRegistryCampaigns(stripe, sinceUnix)
  return {
    individuals: buildDonorHallOfFameLists(rows, "person"),
    organizations: buildDonorHallOfFameLists(rows, "organization"),
  }
}
