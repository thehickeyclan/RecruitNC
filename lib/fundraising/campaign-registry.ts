/**
 * NC United fundraising campaigns — admin playbook + Stripe (`spartan_campaign` metadata).
 *
 * **Launch checklist**
 * 1. Add a row below (`stripeCampaignSlug` must match Checkout session metadata).
 * 2. Public page: use `app/spartan` as the framework (clone route + components; wire checkout metadata the same way).
 * 3. Checkout flow must set `spartan_campaign` plus athlete-related metadata keys consistent with that pipeline.
 * 4. Multiple rows → playbook shows a campaign switcher; admin APIs accept optional `?campaign=<stripeCampaignSlug>` (default = first row).
 */

export type FundraisingCampaignDefinition = {
  /** Stable id for tabs and localStorage (no spaces). */
  adminContextKey: string
  /** Stripe Checkout session metadata `spartan_campaign` — must match what checkout sets. */
  stripeCampaignSlug: string
  /** Short label for the tab. */
  tabLabel: string
  /** Human title under the playbook header. */
  campaignDisplayName: string
  /** Public donation page path, e.g. `/spartan` — use HardLink for in-app navigation. */
  publicPagePath: string
  /** Deep-link query param for pre-selected athlete (Spartan pattern: `?athlete=NCU-…`). */
  athleteQueryParam: string
  defaultLookbackDays: number
  /**
   * When `fundraising_campaigns.goal_cents` is null/0, hub cards use this for progress (cents).
   * Keeps the public hub honest vs a known campaign target (e.g. $10k Spartan drive).
   */
  hubDefaultGoalCents?: number
  /**
   * Athlete gift-activity table (e.g. "Spring Spartan 2026"). Use registry campaigns when metadata matches;
   * otherwise the UI falls back to calendar season + year.
   */
  athleteGiftHistoryLabel: string
}

export const NC_UNITED_FUNDRAISING_BRAND = {
  navy: "#003366",
  crimson: "#C8102E",
} as const

export const FUNDRAISING_CAMPAIGNS = [
  {
    adminContextKey: "spartan-spring-2026",
    stripeCampaignSlug: "fayetteville_2026",
    tabLabel: "Spartan Spring ’26",
    campaignDisplayName: "Spartan Spring 2026 — Fayetteville",
    publicPagePath: "/spartan",
    athleteQueryParam: "athlete",
    defaultLookbackDays: 120,
    hubDefaultGoalCents: 1_000_000,
    athleteGiftHistoryLabel: "Spring Spartan 2026",
  },
] as const satisfies readonly FundraisingCampaignDefinition[]

export const DEFAULT_FUNDRAISING_CAMPAIGN: FundraisingCampaignDefinition = FUNDRAISING_CAMPAIGNS[0]

/**
 * True when Stripe Checkout metadata `spartan_campaign` should be rolled into `requestedRegistrySlug`
 * (e.g. historic `fayetteville_spartan` checkouts vs current registry `fayetteville_2026`).
 * Empty / missing metadata returns false — caller decides whether to list those sessions.
 */
export function stripeSpartanCampaignMetadataMatchesRequested(
  metadataSpartanCampaign: string | null | undefined,
  requestedRegistrySlug: string,
): boolean {
  const s = (metadataSpartanCampaign ?? "").trim()
  if (!s) return false
  if (s === requestedRegistrySlug) return true
  if (requestedRegistrySlug === "fayetteville_2026" && s === "fayetteville_spartan") return true
  return false
}

/**
 * `spartan_donations` rows with no `spartan_campaign` are usually legacy webhook rows before the column was reliable.
 * While there is a single Spartan drive in the registry, treat those as the default campaign so the hub does not
 * under-count vs live Stripe lists.
 */
export function hubSpartanDonationRowMatchesCampaign(
  rowSpartanCampaign: string | null | undefined,
  campaign: FundraisingCampaignDefinition,
): boolean {
  const c = (rowSpartanCampaign ?? "").trim()
  if (!c) {
    return (
      FUNDRAISING_CAMPAIGNS.length === 1 &&
      campaign.stripeCampaignSlug === DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug
    )
  }
  return stripeSpartanCampaignMetadataMatchesRequested(c, campaign.stripeCampaignSlug)
}

/** Maps DB / metadata slug to registry `stripeCampaignSlug` for hub rollups (cards, metrics). */
export function normalizeRegistryStripeCampaignSlug(metadataSlug: string | null | undefined): string {
  const s = (metadataSlug ?? "").trim()
  if (!s) {
    return FUNDRAISING_CAMPAIGNS.length === 1 ? DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug : "__unknown__"
  }
  if (s === "fayetteville_spartan") return "fayetteville_2026"
  return s
}

/** Gift date in America/New_York → "Spring 2026" (no campaign). */
export function seasonYearLabelForGiftDate(isoUtc: string): string {
  const d = new Date(isoUtc)
  if (Number.isNaN(d.getTime())) return "—"
  const intl = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric", year: "numeric" })
  const parts = intl.formatToParts(d)
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "1")
  const year = Number(parts.find((p) => p.type === "year")?.value ?? d.getUTCFullYear())
  let season: string
  if (month >= 3 && month <= 5) season = "Spring"
  else if (month >= 6 && month <= 8) season = "Summer"
  else if (month >= 9 && month <= 11) season = "Fall"
  else season = "Winter"
  return `${season} ${year}`
}

function humanizeUnknownCampaignSlug(slug: string): string {
  return slug
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Label for athlete public gift lists: registry campaign name when `spartan_campaign` metadata matches;
 * unknown non-empty slug → title-cased slug; empty / unknown with no registry match → season + year (ET).
 */
export function publicGiftCampaignLabel(metadataSlug: string | null | undefined, giftIsoUtc: string): string {
  const raw = (metadataSlug ?? "").trim()
  const norm = normalizeRegistryStripeCampaignSlug(raw)
  if (norm !== "__unknown__") {
    const c = fundraisingCampaignByStripeSlug(norm)
    if (c) return c.athleteGiftHistoryLabel
  }
  if (raw) return humanizeUnknownCampaignSlug(raw)
  return seasonYearLabelForGiftDate(giftIsoUtc)
}

/**
 * Campaign-agnostic checkout (hub branding). Same `/api/spartan/checkout` + metadata as `/spartan`.
 * Public athlete donor pages (`/fundraising/athletes/...`) use this path so gifts are not routed through the `/spartan` landing.
 */
export const FUNDRAISING_GIVE_PAGE_PATH = "/fundraising/give"

export function fundraisingCampaignByContextKey(key: string): FundraisingCampaignDefinition | undefined {
  return FUNDRAISING_CAMPAIGNS.find((c) => c.adminContextKey === key)
}

export function fundraisingCampaignByStripeSlug(slug: string): FundraisingCampaignDefinition | undefined {
  return FUNDRAISING_CAMPAIGNS.find((c) => c.stripeCampaignSlug === slug)
}

/**
 * Resolve `/fundraising/[campaignSlug]` — matches `adminContextKey` or `stripeCampaignSlug` (case-insensitive).
 */
export function fundraisingCampaignByPortalSlug(raw: string): FundraisingCampaignDefinition | undefined {
  const s = raw.trim().toLowerCase()
  if (!s) return undefined
  return FUNDRAISING_CAMPAIGNS.find(
    (c) => c.adminContextKey.toLowerCase() === s || c.stripeCampaignSlug.toLowerCase() === s,
  )
}

/** Stable portal path for marketing links (prefer `adminContextKey` in URLs). */
export function fundraisingCampaignPortalPath(campaign: FundraisingCampaignDefinition): string {
  return `/fundraising/${campaign.adminContextKey}`
}

export type CampaignQueryResolution =
  | { ok: true; campaign: FundraisingCampaignDefinition }
  | { ok: false; error: string }

/** Empty or missing query param → default campaign. Unknown slug → error (for APIs). */
export function resolveFundraisingCampaignQueryParam(campaignParam: string | null): CampaignQueryResolution {
  const trimmed = campaignParam?.trim()
  if (!trimmed) return { ok: true, campaign: DEFAULT_FUNDRAISING_CAMPAIGN }
  const found = fundraisingCampaignByStripeSlug(trimmed)
  if (!found) {
    return {
      ok: false,
      error: `Unknown campaign "${trimmed}". Known: ${FUNDRAISING_CAMPAIGNS.map((c) => c.stripeCampaignSlug).join(", ")}`,
    }
  }
  return { ok: true, campaign: found }
}

export function adminFundraisingLeaderboardStorageKey(adminContextKey: string): string {
  return `recruitnc_admin_fundraising_${adminContextKey}_leaderboard`
}

export function adminFundraisingNotesStorageKey(adminContextKey: string): string {
  return `recruitnc_admin_fundraising_${adminContextKey}_notes`
}
