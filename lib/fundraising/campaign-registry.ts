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
  },
] as const satisfies readonly FundraisingCampaignDefinition[]

export const DEFAULT_FUNDRAISING_CAMPAIGN: FundraisingCampaignDefinition = FUNDRAISING_CAMPAIGNS[0]

export function fundraisingCampaignByContextKey(key: string): FundraisingCampaignDefinition | undefined {
  return FUNDRAISING_CAMPAIGNS.find((c) => c.adminContextKey === key)
}

export function fundraisingCampaignByStripeSlug(slug: string): FundraisingCampaignDefinition | undefined {
  return FUNDRAISING_CAMPAIGNS.find((c) => c.stripeCampaignSlug === slug)
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
