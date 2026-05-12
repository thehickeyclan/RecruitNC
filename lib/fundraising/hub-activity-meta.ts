import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  FUNDRAISING_CAMPAIGNS,
  fundraisingCampaignByStripeSlug,
  normalizeRegistryStripeCampaignSlug,
  publicGiftCampaignLabel,
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

/** Stripe `fundraising_checkout_surface` → short prefix before campaign tab label (donor activity / hub feeds). */
const CHECKOUT_SURFACE_PREFIX: Record<string, string> = {
  athlete_page: "Athlete page",
  training_fund: "Training fund",
  scholarship_fund: "Scholarship",
}

/** Like {@link hubActivityCampaignFromStripeSlug}, but prefixes the display label when checkout was not the main team page. */
export function hubActivityCampaignWithCheckoutSurface(
  spartanSlug: string | null | undefined,
  fundraisingCheckoutSurface: string | null | undefined,
): { campaignStripeSlug: string | null; campaignShortLabel: string } {
  const base = hubActivityCampaignFromStripeSlug(spartanSlug)
  const s = fundraisingCheckoutSurface?.trim()
  if (!s) return base
  const prefix = CHECKOUT_SURFACE_PREFIX[s]
  if (!prefix) return base
  return { ...base, campaignShortLabel: `${prefix} · ${base.campaignShortLabel}` }
}

/**
 * Athlete `/fundraising/athletes/...` gift table: same labels as {@link publicGiftCampaignLabel}, plus checkout surface when present.
 */
export function publicGiftCampaignLabelWithCheckoutSurface(
  metadataSlug: string | null | undefined,
  giftIsoUtc: string,
  fundraisingCheckoutSurface: string | null | undefined,
): string {
  const base = publicGiftCampaignLabel(metadataSlug, giftIsoUtc)
  const s = fundraisingCheckoutSurface?.trim()
  if (!s) return base
  const prefix = CHECKOUT_SURFACE_PREFIX[s]
  if (!prefix) return base
  return `${prefix} · ${base}`
}

export function fundraisingCheckoutSurfaceFromRawMetadata(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const v = (raw as Record<string, unknown>).fundraising_checkout_surface
  return typeof v === "string" && v.trim() ? v.trim() : null
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
