import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  FUNDRAISING_CAMPAIGNS,
  fundraisingCampaignByStripeSlug,
  fundraisingCampaignPortalPath,
  hubSpartanDonationRowMatchesCampaign,
  normalizeRegistryStripeCampaignSlug,
  type FundraisingCampaignDefinition,
} from "@/lib/fundraising/campaign-registry"
import { fundraisingCodeToFullNameMap, getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
  type SpartanCreditCorrectionsIndex,
} from "@/lib/spartan-credit-corrections"
import { loadCorrectedStripeDonationsForAllHubCampaignsWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import {
  hubActivityGiftSourceLabels,
  resolveFundraisingCheckoutSurface,
} from "@/lib/fundraising/hub-activity-meta"
import {
  attachPublicSupporterFields,
  buildSpartanPublicSupporterSummary,
  type SpartanDonationWithPublicFields,
} from "@/lib/spartan-public-supporter-feed"
import type { SpartanFayettevilleDonation } from "@/lib/spartan-fayetteville-stripe"

/** Paid Spartan rows mirrored from Stripe (`spartan_donations`). Not the generic `donations` table. */
export type HubDonationRow = {
  id: string
  created_at: string
  amount_cents: number | null
  donor_email: string | null
  donor_name: string | null
  athlete_code: string | null
  athlete_display_name: string | null
  spartan_campaign: string | null
  /** Checkout origin (metadata or success_url at webhook). Query in SQL without Stripe. */
  fundraising_checkout_surface?: string | null
  fundraising_athlete_slug?: string | null
  /** Present when synced from Stripe webhook — used for PI-keyed credit corrections. */
  raw_metadata?: unknown
}

/** Hero totals: combined paid hub checkouts in the transparency window (Stripe + corrections when available). */
export type FundraisingHubHeroStats = {
  totalRaisedCents: number
  /** Paid checkout sessions in window (donations + bundled flows counted by ledger). */
  giftCount: number
  raceEntryCount: number
  ncUnitedCommunityFundCents: number
}

export type FundraisingHubCampaignCard = {
  id: string
  name: string
  partnerLogoUrl: string | null
  heroImageUrl: string | null
  goalCents: number | null
  endsAt: string | null
  raisedCents: number
  participatingAthletes: number
  href: string
  stripeCampaignSlug: string | null
}

export type FundraisingHubLeaderRow = {
  rank: number
  athleteCode: string
  athleteName: string
  school: string
  raisedCents: number
  /** Paid checkout sessions credited to this athlete in the combined window. */
  giftCount: number
  /** Distinct donor emails in that set (a donor can give more than once). */
  donorCount: number
  progressPct: number
}

/**
 * Transparency window + registry metadata for filters.
 * Hero, leaderboard preview, and live feed share the same combined hub scope when Stripe lists load.
 */
export type FundraisingHubTransparencyMeta = {
  campaignDisplayName: string
  stripeCampaignSlug: string
  lookbackDays: number
  /** Most recent timed fundraiser in the registry has wound down — hub landing favors year-round framing. */
  timedDriveArchived: boolean
}

/** Serializable mirror of `spartan_credit_corrections` for the hub live feed (realtime rows are raw DB). */
export type FundraisingHubCreditCorrectionsClient = {
  /** Checkout session ids (`cs_…`) and PaymentIntent ids (`pi_…`) credited to NC United fund, not an athlete. */
  generalFundIds: string[]
  /** Overrides: session or PI id → NCU athlete code. */
  athleteBySessionId: Record<string, string>
}

function hubCreditCorrectionsForClient(index: SpartanCreditCorrectionsIndex): FundraisingHubCreditCorrectionsClient {
  return {
    generalFundIds: [...index.generalFundSessionOrPi],
    athleteBySessionId: Object.fromEntries(index.athleteBySessionOrPi),
  }
}

export type FundraisingHubActivityRow = {
  id: string
  createdIso: string
  donorDisplay: string
  amountCents: number
  athleteCredit: string
  /** NCU code when gift is credited to an athlete — used for link to /fundraising/athletes/[slug]. */
  athleteCode: string | null
  /** Normalized registry Stripe slug when known. */
  campaignStripeSlug?: string | null
  /** Where checkout started — Athlete page, Spartan page, Unspecified, … */
  giftSourceLabel: string
  /** Registry campaign name only (e.g. Spartan Spring '26). */
  campaignNameLabel: string
  /** @deprecated Prefer {@link giftSourceLabel} + {@link campaignNameLabel}. Kept = campaignNameLabel for older consumers. */
  campaignShortLabel?: string
}

export type FundraisingHubSnapshot = {
  hero: FundraisingHubHeroStats
  campaigns: FundraisingHubCampaignCard[]
  leaderboard: FundraisingHubLeaderRow[]
  activity: FundraisingHubActivityRow[]
  hubTransparency: FundraisingHubTransparencyMeta
  creditCorrections: FundraisingHubCreditCorrectionsClient
}

const PAGE = 900

function formatDonorPublic(name: string | null | undefined): string {
  const t = name?.trim()
  if (!t) return "Anonymous supporter"
  return t
}

function schoolFromFundraisingLabel(label: string): string {
  const idx = label.indexOf("·")
  if (idx === -1) return ""
  return label.slice(idx + 1).trim()
}

async function fetchAllPaidHubDonations(admin: SupabaseClient): Promise<HubDonationRow[]> {
  const out: HubDonationRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await admin
      .from("spartan_donations")
      .select(
        "id, created_at, amount_cents, donor_email, donor_name, athlete_code, athlete_display_name, spartan_campaign, fundraising_checkout_surface, fundraising_athlete_slug, raw_metadata",
      )
      .eq("status", "paid")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        const hint =
          /fundraising_checkout_surface|fundraising_athlete_slug|42703/i.test(error.message ?? "")
            ? " Run scripts/supabase-spartan-donations-checkout-surface.sql in Supabase SQL Editor (adds missing columns)."
            : ""
        console.warn("[fundraising/hub-data] spartan_donations unavailable:", error.message, hint)
      } else {
        console.error("[fundraising/hub-data] spartan_donations:", error.message)
      }
      break
    }
    const batch = (data ?? []) as HubDonationRow[]
    out.push(...batch)
    if (batch.length < PAGE) break
    from += PAGE
  }
  return out
}

function withEffectiveAthleteCodes(rows: HubDonationRow[], index: SpartanCreditCorrectionsIndex): HubDonationRow[] {
  if (index.athleteBySessionOrPi.size === 0 && index.generalFundSessionOrPi.size === 0) return rows
  return rows.map((r) => ({
    ...r,
    athlete_code: effectiveAthleteCodeForDonationLedgerRow(
      { id: r.id, athlete_code: r.athlete_code, raw_metadata: r.raw_metadata },
      index,
    ),
  }))
}

function filterHubRowsForAllRegisteredCampaignsLookback(rows: HubDonationRow[], lookbackDays: number): HubDonationRow[] {
  const cutoffMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000
  return rows.filter((r) => {
    if (!FUNDRAISING_CAMPAIGNS.some((c) => hubSpartanDonationRowMatchesCampaign(r.spartan_campaign, c))) return false
    const t = new Date(r.created_at).getTime()
    return Number.isFinite(t) && t >= cutoffMs
  })
}

type CampaignDbRow = Record<string, unknown>

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim()) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}

async function fetchActiveCampaignsFromDb(admin: SupabaseClient): Promise<CampaignDbRow[] | null> {
  const { data, error } = await admin.from("fundraising_campaigns").select("*").eq("status", "active")
  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return null
    }
    console.warn("[fundraising/hub-data] fundraising_campaigns:", error.message)
    return null
  }
  return data ?? []
}

function aggregateByCampaign(rows: HubDonationRow[]): Map<string, { raisedCents: number; athletes: Set<string> }> {
  const m = new Map<string, { raisedCents: number; athletes: Set<string> }>()
  for (const r of rows) {
    const key = normalizeRegistryStripeCampaignSlug(r.spartan_campaign)
    let b = m.get(key)
    if (!b) {
      b = { raisedCents: 0, athletes: new Set<string>() }
      m.set(key, b)
    }
    b.raisedCents += r.amount_cents ?? 0
    const code = r.athlete_code?.trim()
    if (code) b.athletes.add(code.toLowerCase())
  }
  return m
}

function hubDonationRowsFromStripeDonations(rows: SpartanFayettevilleDonation[]): HubDonationRow[] {
  return rows.map((r) => ({
    id: r.sessionId,
    created_at: r.createdIso,
    amount_cents: r.amountCents,
    donor_email: r.donorEmail,
    donor_name: r.donorName,
    athlete_code: r.athleteCode,
    athlete_display_name: r.athleteDisplayName,
    spartan_campaign: r.spartanCampaignSlug,
    raw_metadata: undefined,
  }))
}

function computeHeroFromStripeRows(rows: SpartanFayettevilleDonation[]): FundraisingHubHeroStats {
  const s = buildSpartanPublicSupporterSummary(rows)
  return {
    totalRaisedCents: s.totalRaisedCents,
    giftCount: s.giftCount,
    raceEntryCount: s.raceEntryCount,
    ncUnitedCommunityFundCents: s.ncUnitedCommunityFundCents,
  }
}

function stripeEnrichedToActivity(rows: SpartanDonationWithPublicFields[]): FundraisingHubActivityRow[] {
  return rows.map((r) => {
    const codeRaw = r.athleteCode?.trim() ?? ""
    const label = (r.creditLabel ?? "").trim()
    const { campaignStripeSlug, campaignNameLabel, giftSourceLabel } = hubActivityGiftSourceLabels(
      r.spartanCampaignSlug,
      r.fundraisingCheckoutSurface,
    )
    return {
      id: r.sessionId,
      createdIso: r.createdIso,
      donorDisplay: formatDonorPublic(r.publicDisplayName),
      amountCents: r.amountCents,
      athleteCredit: !codeRaw ? "NC United general fund" : label || codeRaw,
      athleteCode: codeRaw ? r.athleteCode!.trim() : null,
      campaignStripeSlug,
      giftSourceLabel,
      campaignNameLabel,
      campaignShortLabel: campaignNameLabel,
    }
  })
}

function computeHero(rows: HubDonationRow[]): FundraisingHubHeroStats {
  let totalRaisedCents = 0
  let ncUnitedCommunityFundCents = 0
  for (const r of rows) {
    const cents = r.amount_cents ?? 0
    totalRaisedCents += cents
    // NC United fund = raw_metadata.fundraising_attribution === 'general_nc_united'
    const meta = r.raw_metadata as Record<string, unknown> | null | undefined
    const attribution = typeof meta?.fundraising_attribution === 'string' ? meta.fundraising_attribution : ''
    if (attribution === 'general_nc_united') {
      ncUnitedCommunityFundCents += cents
    }
  }
  return {
    totalRaisedCents,
    giftCount: rows.length,
    raceEntryCount: 0,
    ncUnitedCommunityFundCents,
  }
}

function canonicalAthleteCodes(rows: HubDonationRow[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const r of rows) {
    const c = r.athlete_code?.trim()
    if (!c) continue
    const low = c.toLowerCase()
    if (!m.has(low)) m.set(low, c)
  }
  return m
}

function computeLeaderboard(
  rows: HubDonationRow[],
  codeToFullName: Map<string, string>,
  schoolByCodeLower: Map<string, string>,
): FundraisingHubLeaderRow[] {
  type Agg = { raisedCents: number; giftCount: number; donors: Set<string>; displayName: string }
  const byCode = new Map<string, Agg>()
  for (const r of rows) {
    const codeRaw = r.athlete_code?.trim()
    if (!codeRaw) continue
    const key = codeRaw.toLowerCase()
    let a = byCode.get(key)
    if (!a) {
      a = { raisedCents: 0, giftCount: 0, donors: new Set<string>(), displayName: "" }
      byCode.set(key, a)
    }
    a.raisedCents += r.amount_cents ?? 0
    a.giftCount += 1
    const em = r.donor_email?.trim().toLowerCase()
    if (em) a.donors.add(em)
    const dn = (r.athlete_display_name ?? "").trim()
    if (dn.length > a.displayName.length) a.displayName = dn
  }

  const sorted = [...byCode.entries()].sort((x, y) => y[1].raisedCents - x[1].raisedCents)

  const topRaised = sorted[0]?.[1].raisedCents ?? 1
  const canon = canonicalAthleteCodes(rows)

  return sorted.map(([codeLower, agg], i) => {
    const display =
      codeToFullName.get(codeLower) ||
      agg.displayName ||
      canon.get(codeLower) ||
      codeLower
    const school = schoolByCodeLower.get(codeLower) ?? ""
    const pct = topRaised > 0 ? Math.round((agg.raisedCents / topRaised) * 100) : 0
    return {
      rank: i + 1,
      athleteCode: canon.get(codeLower) ?? codeLower,
      athleteName: display,
      school,
      raisedCents: agg.raisedCents,
      giftCount: agg.giftCount,
      donorCount: agg.donors.size,
      progressPct: Math.min(100, pct),
    }
  })
}

function rowsToActivity(rows: HubDonationRow[]): FundraisingHubActivityRow[] {
  return rows.map((r) => {
    const codeRaw = r.athlete_code?.trim() ?? ""
    const athleteCredit = !codeRaw
      ? "NC United general fund"
      : (r.athlete_display_name ?? "").trim() || codeRaw || "NC United general fund"
    const surface = resolveFundraisingCheckoutSurface(r.fundraising_checkout_surface, r.raw_metadata)
    const { campaignStripeSlug, campaignNameLabel, giftSourceLabel } = hubActivityGiftSourceLabels(
      r.spartan_campaign,
      surface,
    )
    return {
      id: r.id,
      createdIso: r.created_at,
      donorDisplay: formatDonorPublic(r.donor_name),
      amountCents: r.amount_cents ?? 0,
      athleteCredit,
      athleteCode: codeRaw ? codeRaw : null,
      campaignStripeSlug,
      giftSourceLabel,
      campaignNameLabel,
      campaignShortLabel: campaignNameLabel,
    }
  })
}

function dbRowsToCards(
  dbRows: CampaignDbRow[],
  metrics: Map<string, { raisedCents: number; athletes: Set<string> }>,
): FundraisingHubCampaignCard[] {
  const list = [...dbRows].sort((a, b) => (num(a.sort_order) ?? 0) - (num(b.sort_order) ?? 0))
  return list.map((row, i) => {
    const stripeSlug = str(row.stripe_campaign_slug) ?? str(row.slug)
    const m = stripeSlug ? metrics.get(stripeSlug) : undefined
    const raised = m?.raisedCents ?? 0
    const participating = m?.athletes.size ?? 0
    const reg = stripeSlug ? fundraisingCampaignByStripeSlug(stripeSlug) : undefined
    /** Prefer registry public page (e.g. `/spartan`) over DB `public_path` so hub cards match live checkout. */
    const href =
      reg?.publicPagePath ??
      str(row.public_path) ??
      (reg ? fundraisingCampaignPortalPath(reg) : stripeSlug ? `/fundraising/${stripeSlug}` : "/fundraising")
    const dbGoal = num(row.goal_cents)
    const goalCents =
      dbGoal != null && dbGoal > 0
        ? dbGoal
        : reg?.hubDefaultGoalCents != null && reg.hubDefaultGoalCents > 0
          ? reg.hubDefaultGoalCents
          : null
    return {
      id: str(row.id) ?? str(row.slug) ?? `campaign-${i}`,
      name: str(row.name) ?? str(row.title) ?? "Campaign",
      partnerLogoUrl: str(row.partner_logo_url),
      heroImageUrl: str(row.hero_image_url) ?? "/images/spartan-race-banner.png",
      goalCents,
      endsAt: str(row.ends_at),
      raisedCents: raised,
      participatingAthletes: participating,
      href,
      stripeCampaignSlug: stripeSlug,
    }
  })
}

export async function buildFundraisingHubSnapshot(admin?: SupabaseClient): Promise<FundraisingHubSnapshot> {
  const client = admin ?? createAdminClient()

  const [allRows, directory, dbCampaigns, correctionIndex] = await Promise.all([
    fetchAllPaidHubDonations(client),
    getFundraisingAthleteEntries(client),
    fetchActiveCampaignsFromDb(client),
    fetchSpartanCreditCorrectionsIndex(client),
  ])

  const allRowsAdjusted = withEffectiveAthleteCodes(allRows, correctionIndex)

  const codeToFullName = fundraisingCodeToFullNameMap(directory)
  const schoolByCodeLower = new Map<string, string>()
  for (const e of directory) {
    schoolByCodeLower.set(e.code.trim().toLowerCase(), schoolFromFundraisingLabel(e.label))
  }

  const lookbackDays = DEFAULT_FUNDRAISING_CAMPAIGN.defaultLookbackDays
  /** Combined Stripe sessions for every registered hub campaign — hero, leaderboard, and activity match this scope. */
  const allHubStripeRows = await loadCorrectedStripeDonationsForAllHubCampaignsWindow(lookbackDays, correctionIndex)

  let hero: FundraisingHubHeroStats
  let leaderboard: FundraisingHubLeaderRow[]
  let activity: FundraisingHubActivityRow[]

  if (allHubStripeRows != null) {
    hero = computeHeroFromStripeRows(allHubStripeRows)
    leaderboard = computeLeaderboard(
      hubDonationRowsFromStripeDonations(allHubStripeRows),
      codeToFullName,
      schoolByCodeLower,
    )
    const enrichedAll = attachPublicSupporterFields(allHubStripeRows, codeToFullName)
    const actSorted = [...enrichedAll].sort((a, b) => b.createdUnix - a.createdUnix)
    activity = stripeEnrichedToActivity(actSorted)
  } else {
    const allCampaignDbRows = filterHubRowsForAllRegisteredCampaignsLookback(allRowsAdjusted, lookbackDays)
    hero = computeHero(allCampaignDbRows)
    leaderboard = computeLeaderboard(allCampaignDbRows, codeToFullName, schoolByCodeLower)
    const activitySorted = [...allCampaignDbRows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    activity = rowsToActivity(activitySorted)
  }

  const metrics = aggregateByCampaign(allRowsAdjusted)

  /** Hub shows only `fundraising_campaigns` rows with status active; otherwise the UI shows year-round giving. */
  const campaigns: FundraisingHubCampaignCard[] =
    dbCampaigns && dbCampaigns.length > 0 ? dbRowsToCards(dbCampaigns, metrics) : []

  const hubTransparency: FundraisingHubTransparencyMeta = {
    campaignDisplayName: DEFAULT_FUNDRAISING_CAMPAIGN.campaignDisplayName,
    stripeCampaignSlug: DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug,
    lookbackDays,
    timedDriveArchived: Boolean(DEFAULT_FUNDRAISING_CAMPAIGN.playbookOperationalBanner),
  }

  return { hero, campaigns, leaderboard, activity, hubTransparency, creditCorrections: hubCreditCorrectionsForClient(correctionIndex) }
}

export async function getFundraisingHubSnapshot(): Promise<FundraisingHubSnapshot> {
  return buildFundraisingHubSnapshot()
}
