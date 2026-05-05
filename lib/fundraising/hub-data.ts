import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  FUNDRAISING_CAMPAIGNS,
  fundraisingCampaignByStripeSlug,
  fundraisingCampaignPortalPath,
  hubSpartanDonationRowMatchesCampaign,
  normalizeRegistryStripeCampaignSlug,
  stripeSpartanCampaignMetadataMatchesRequested,
  type FundraisingCampaignDefinition,
} from "@/lib/fundraising/campaign-registry"
import { fundraisingCodeToFullNameMap, getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
  type SpartanCreditCorrectionsIndex,
} from "@/lib/spartan-credit-corrections"
import { loadCorrectedStripeDonationsForAllHubCampaignsWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import { hubActivityCampaignFromStripeSlug } from "@/lib/fundraising/hub-activity-meta"
import {
  attachPublicSupporterFields,
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
  /** Present when synced from Stripe webhook — used for PI-keyed credit corrections. */
  raw_metadata?: unknown
}

export type FundraisingHubHeroStats = {
  totalRaisedCents: number
  totalDonors: number
  athletesFunded: number
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
  /** Paid checkout sessions credited to this athlete (matches `/api/spartan/supporters` gifts). */
  giftCount: number
  /** Distinct donor emails in that set (a donor can give more than once). */
  donorCount: number
  progressPct: number
}

/** Hero stats use primary campaign; leaderboard + live activity span all registered hub campaigns (see hub build). */
export type FundraisingHubTransparencyMeta = {
  campaignDisplayName: string
  stripeCampaignSlug: string
  lookbackDays: number
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
  /** Short tab label for filters / badges (e.g. Spartan Spring '26). */
  campaignShortLabel?: string
}

export type FundraisingHubSnapshot = {
  hero: FundraisingHubHeroStats
  campaigns: FundraisingHubCampaignCard[]
  leaderboard: FundraisingHubLeaderRow[]
  activity: FundraisingHubActivityRow[]
  hubTransparency: FundraisingHubTransparencyMeta
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
        "id, created_at, amount_cents, donor_email, donor_name, athlete_code, athlete_display_name, spartan_campaign, raw_metadata",
      )
      .eq("status", "paid")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1)

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("[fundraising/hub-data] spartan_donations unavailable:", error.message)
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

/**
 * Same scope as `listSpartanFayettevilleDonations` + `/api/spartan/supporters`: registry campaign (including
 * legacy Stripe metadata aliases) and `created_at` within the campaign default lookback.
 */
function filterHubRowsForTransparencyWindow(
  rows: HubDonationRow[],
  campaign: FundraisingCampaignDefinition,
): HubDonationRow[] {
  const cutoffMs = Date.now() - campaign.defaultLookbackDays * 24 * 60 * 60 * 1000
  return rows.filter((r) => {
    if (!hubSpartanDonationRowMatchesCampaign(r.spartan_campaign, campaign)) return false
    const t = new Date(r.created_at).getTime()
    return Number.isFinite(t) && t >= cutoffMs
  })
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
  let totalRaisedCents = 0
  const donorEmails = new Set<string>()
  const athleteCodes = new Set<string>()
  for (const r of rows) {
    totalRaisedCents += r.amountCents
    const em = r.donorEmail?.trim().toLowerCase()
    if (em) donorEmails.add(em)
    const code = r.athleteCode?.trim()
    if (code) athleteCodes.add(code.toLowerCase())
  }
  return {
    totalRaisedCents,
    totalDonors: donorEmails.size,
    athletesFunded: athleteCodes.size,
  }
}

function stripeEnrichedToActivity(rows: SpartanDonationWithPublicFields[]): FundraisingHubActivityRow[] {
  return rows.map((r) => {
    const codeRaw = r.athleteCode?.trim() ?? ""
    const label = (r.creditLabel ?? "").trim()
    const { campaignStripeSlug, campaignShortLabel } = hubActivityCampaignFromStripeSlug(r.spartanCampaignSlug)
    return {
      id: r.sessionId,
      createdIso: r.createdIso,
      donorDisplay: formatDonorPublic(r.publicDisplayName),
      amountCents: r.amountCents,
      athleteCredit: !codeRaw ? "NC United general fund" : label || codeRaw,
      athleteCode: codeRaw ? r.athleteCode!.trim() : null,
      campaignStripeSlug,
      campaignShortLabel,
    }
  })
}

function computeHero(rows: HubDonationRow[]): FundraisingHubHeroStats {
  let totalRaisedCents = 0
  const donorEmails = new Set<string>()
  const athleteCodes = new Set<string>()
  for (const r of rows) {
    totalRaisedCents += r.amount_cents ?? 0
    const em = r.donor_email?.trim().toLowerCase()
    if (em) donorEmails.add(em)
    const code = r.athlete_code?.trim()
    if (code) athleteCodes.add(code.toLowerCase())
  }
  return {
    totalRaisedCents,
    totalDonors: donorEmails.size,
    athletesFunded: athleteCodes.size,
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

  const sorted = [...byCode.entries()].sort((x, y) => y[1].raisedCents - x[1].raisedCents).slice(0, 10)

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
  return rows.slice(0, 20).map((r) => {
    const codeRaw = r.athlete_code?.trim() ?? ""
    const athleteCredit = !codeRaw
      ? "NC United general fund"
      : (r.athlete_display_name ?? "").trim() || codeRaw || "NC United general fund"
    const { campaignStripeSlug, campaignShortLabel } = hubActivityCampaignFromStripeSlug(r.spartan_campaign)
    return {
      id: r.id,
      createdIso: r.created_at,
      donorDisplay: formatDonorPublic(r.donor_name),
      amountCents: r.amount_cents ?? 0,
      athleteCredit,
      athleteCode: codeRaw ? codeRaw : null,
      campaignStripeSlug,
      campaignShortLabel,
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
  const allHubStripeRows = await loadCorrectedStripeDonationsForAllHubCampaignsWindow(lookbackDays, correctionIndex)
  const defaultSlug = DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug
  const primaryCampaignStripeRows =
    allHubStripeRows != null
      ? allHubStripeRows.filter((r) => stripeSpartanCampaignMetadataMatchesRequested(r.spartanCampaignSlug, defaultSlug))
      : null

  let hero: FundraisingHubHeroStats
  let leaderboard: FundraisingHubLeaderRow[]
  let activity: FundraisingHubActivityRow[]

  if (primaryCampaignStripeRows != null) {
    hero = computeHeroFromStripeRows(primaryCampaignStripeRows)
    if (allHubStripeRows != null) {
      leaderboard = computeLeaderboard(
        hubDonationRowsFromStripeDonations(allHubStripeRows),
        codeToFullName,
        schoolByCodeLower,
      )
    } else {
      leaderboard = computeLeaderboard(
        filterHubRowsForAllRegisteredCampaignsLookback(allRowsAdjusted, lookbackDays),
        codeToFullName,
        schoolByCodeLower,
      )
    }
    const enrichedAll = attachPublicSupporterFields(allHubStripeRows, codeToFullName)
    const actSorted = [...enrichedAll].sort((a, b) => b.createdUnix - a.createdUnix)
    activity = stripeEnrichedToActivity(actSorted.slice(0, 20))
  } else {
    const transparencyRows = filterHubRowsForTransparencyWindow(allRowsAdjusted, DEFAULT_FUNDRAISING_CAMPAIGN)
    hero = computeHero(transparencyRows)
    leaderboard = computeLeaderboard(
      filterHubRowsForAllRegisteredCampaignsLookback(allRowsAdjusted, lookbackDays),
      codeToFullName,
      schoolByCodeLower,
    )
    const allCampaignDbRows = filterHubRowsForAllRegisteredCampaignsLookback(allRowsAdjusted, lookbackDays)
    const activitySorted = [...allCampaignDbRows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    activity = rowsToActivity(activitySorted.slice(0, 20))
  }

  const metrics = aggregateByCampaign(allRowsAdjusted)

  /** Hub shows only `fundraising_campaigns` rows with status active; otherwise the UI shows year-round giving. */
  const campaigns: FundraisingHubCampaignCard[] =
    dbCampaigns && dbCampaigns.length > 0 ? dbRowsToCards(dbCampaigns, metrics) : []

  const hubTransparency: FundraisingHubTransparencyMeta = {
    campaignDisplayName: DEFAULT_FUNDRAISING_CAMPAIGN.campaignDisplayName,
    stripeCampaignSlug: DEFAULT_FUNDRAISING_CAMPAIGN.stripeCampaignSlug,
    lookbackDays,
  }

  return { hero, campaigns, leaderboard, activity, hubTransparency }
}

export async function getFundraisingHubSnapshot(): Promise<FundraisingHubSnapshot> {
  return buildFundraisingHubSnapshot()
}
