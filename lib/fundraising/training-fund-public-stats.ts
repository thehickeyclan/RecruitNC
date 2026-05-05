import { createAdminClient } from "@/lib/supabase/admin"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  hubSpartanDonationRowMatchesCampaign,
  publicGiftCampaignLabel,
} from "@/lib/fundraising/campaign-registry"
import { loadCorrectedStripeDonationsForCampaignWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import type { SpartanFayettevilleDonation } from "@/lib/spartan-fayetteville-stripe"

/** Same shape as athlete gift rows for shared table UI. */
export type TrainingFundGiftRow = {
  created_at: string
  donorLabel: string
  amountCents: number
  campaignLabel: string
}

export type TrainingFundPublicStats = {
  raisedCents: number
  giftCount: number
  avgGiftCents: number | null
}

function isTrainingFundDonation(r: SpartanFayettevilleDonation): boolean {
  return (
    r.attribution === "general_nc_united" && !r.athleteCode?.trim() && !r.manualCreditName?.trim()
  )
}

function publicDonorFromStripeMeta(d: SpartanFayettevilleDonation): string {
  if (!d.donorListPublic) return "Anonymous"
  const n = d.donorName?.trim()
  if (n) return n
  return "Supporter"
}

/**
 * Paid checkouts credited to the NC United Training Fund (Spartan metadata: no athlete / general_nc_united).
 * Prefers live Stripe + corrections; falls back to `spartan_donations` mirror when Stripe is unavailable.
 */
export async function getTrainingFundPublicSnapshot(
  giftLimit: number,
): Promise<{ stats: TrainingFundPublicStats; gifts: TrainingFundGiftRow[] }> {
  const corrected = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (corrected != null) {
    const mine = corrected.filter(isTrainingFundDonation)
    let raisedCents = 0
    for (const r of mine) raisedCents += r.amountCents
    const giftCount = mine.length
    mine.sort((a, b) => b.createdUnix - a.createdUnix)
    const lim = Math.min(250, Math.max(1, giftLimit))
    const slice = mine.slice(0, lim)
    const gifts: TrainingFundGiftRow[] = slice.map((r) => ({
      created_at: r.createdIso,
      donorLabel: publicDonorFromStripeMeta(r),
      amountCents: r.amountCents,
      campaignLabel: publicGiftCampaignLabel(r.spartanCampaignSlug ?? null, r.createdIso),
    }))
    return {
      stats: {
        raisedCents,
        giftCount,
        avgGiftCents: giftCount > 0 ? Math.round(raisedCents / giftCount) : null,
      },
      gifts,
    }
  }

  type Row = {
    id: string
    amount_cents: number | null
    created_at?: string
    donor_name?: string | null
    athlete_code?: string | null
    spartan_campaign?: string | null
    raw_metadata?: unknown
  }

  const admin = createAdminClient()
  const sel =
    "id, amount_cents, created_at, donor_name, athlete_code, spartan_campaign, raw_metadata"
  const { data, error } = await admin.from("spartan_donations").select(sel).eq("status", "paid")

  if (error) {
    console.warn("[training-fund-public-stats]", error.message)
    return {
      stats: { raisedCents: 0, giftCount: 0, avgGiftCents: null },
      gifts: [],
    }
  }

  const credited: Row[] = []
  for (const row of (data ?? []) as Row[]) {
    const code = typeof row.athlete_code === "string" ? row.athlete_code.trim() : ""
    if (code) continue
    const meta = row.raw_metadata
    const m = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, string>) : {}
    if (m.fundraising_attribution && m.fundraising_attribution !== "general_nc_united") continue
    const slug =
      typeof row.spartan_campaign === "string" && row.spartan_campaign.trim()
        ? row.spartan_campaign.trim()
        : m.spartan_campaign?.trim() ?? null
    if (!hubSpartanDonationRowMatchesCampaign(slug, DEFAULT_FUNDRAISING_CAMPAIGN)) continue
    credited.push(row)
  }

  credited.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0))

  let raisedCents = 0
  for (const row of credited) {
    raisedCents += typeof row.amount_cents === "number" ? row.amount_cents : 0
  }
  const giftCount = credited.length
  const lim = Math.min(250, Math.max(1, giftLimit))

  function mirrorCampaignSlug(row: Row): string | null {
    if (typeof row.spartan_campaign === "string" && row.spartan_campaign.trim()) return row.spartan_campaign.trim()
    const meta = row.raw_metadata
    if (meta && typeof meta === "object" && !Array.isArray(meta)) {
      const sc = (meta as Record<string, unknown>).spartan_campaign
      if (typeof sc === "string" && sc.trim()) return sc.trim()
    }
    return null
  }

  function mirrorDonorLabel(row: Row): string {
    const meta = row.raw_metadata
    const m = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, string>) : {}
    const v = m.donor_list_public
    const donorListPublic = !(v === "false" || v === "0" || v === "no")
    if (!donorListPublic) return "Anonymous"
    const n =
      typeof row.donor_name === "string" && row.donor_name.trim()
        ? row.donor_name.trim()
        : typeof m.donor_name === "string" && m.donor_name.trim()
          ? m.donor_name.trim()
          : ""
    if (n) return n
    return "Supporter"
  }

  const gifts: TrainingFundGiftRow[] = credited.slice(0, lim).map((row) => ({
    created_at: String(row.created_at ?? ""),
    donorLabel: mirrorDonorLabel(row),
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
    campaignLabel: publicGiftCampaignLabel(mirrorCampaignSlug(row), String(row.created_at ?? "")),
  }))

  return {
    stats: {
      raisedCents,
      giftCount,
      avgGiftCents: giftCount > 0 ? Math.round(raisedCents / giftCount) : null,
    },
    gifts,
  }
}
