import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  FUNDRAISING_CAMPAIGNS,
  fundraisingCampaignByStripeSlug,
  normalizeRegistryStripeCampaignSlug,
} from "@/lib/fundraising/campaign-registry"

/** Stripe `spartan_campaign` metadata → hub feed / gift-log display fields. */
export function hubActivityCampaignFromStripeSlug(raw: string | null | undefined): {
  campaignStripeSlug: string | null
  campaignShortLabel: string
} {
  const norm = normalizeRegistryStripeCampaignSlug(raw)
  if (norm === "__unknown__") {
    const s = (raw ?? "").trim()
    if (!s) {
      if (FUNDRAISING_CAMPAIGNS.length === 1) {
        return {
          campaignStripeSlug: DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug,
          campaignShortLabel: DEFAULT_FUNDRAISING_CAMPAIGN.tabLabel,
        }
      }
      return { campaignStripeSlug: null, campaignShortLabel: "Other" }
    }
    const reg = fundraisingCampaignByStripeSlug(s)
    if (reg) return { campaignStripeSlug: reg.stripeCampaignSlug, campaignShortLabel: reg.tabLabel }
    return {
      campaignStripeSlug: s,
      campaignShortLabel: s
        .replace(/_/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" "),
    }
  }
  const reg = fundraisingCampaignByStripeSlug(norm)
  return {
    campaignStripeSlug: reg?.stripeCampaignSlug ?? norm,
    campaignShortLabel: reg?.tabLabel ?? norm,
  }
}

export function hubActivityRowMatchesCampaignFilter(
  r: { campaignStripeSlug?: string | null },
  filter: string,
): boolean {
  if (filter === "all") return true
  const slug =
    r.campaignStripeSlug ??
    (FUNDRAISING_CAMPAIGNS.length === 1 ? DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug : null)
  if (slug == null) return false
  return slug === filter
}
