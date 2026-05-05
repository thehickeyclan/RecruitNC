import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
} from "@/lib/spartan-credit-corrections"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  hubSpartanDonationRowMatchesCampaign,
  publicGiftCampaignLabel,
} from "@/lib/fundraising/campaign-registry"
import { loadCorrectedStripeDonationsForCampaignWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import {
  aggregateSpartanByAthlete,
  publicSupporterDisplayName,
  type SpartanFayettevilleDonation,
} from "@/lib/spartan-fayetteville-stripe"

const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

export type AthleteFundraisingPublicStats = {
  raisedCents: number
  giftCount: number
  /** Mean gift when giftCount > 0 */
  avgGiftCents: number | null
  /** Receipt type ≈ organization (tax receipt) when Stripe metadata is available */
  organizationGiftCount: number
  individualGiftCount: number
  /** False when sourced from DB mirror without payer_type */
  payerTypeBreakdownKnown: boolean
}

type DonationSelectRow = {
  id: string
  athlete_code: string | null
  amount_cents: number | null
  raw_metadata?: unknown
  created_at?: string
  donor_name?: string | null
  spartan_campaign?: string | null
}

const DONATION_SELECT = "id, athlete_code, amount_cents, raw_metadata"

function spartanCampaignFromDonationMirrorRow(row: DonationSelectRow): string | null {
  const col =
    typeof row.spartan_campaign === "string" && row.spartan_campaign.trim() ? row.spartan_campaign.trim() : null
  if (col) return col
  const meta = row.raw_metadata
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const sc = (meta as Record<string, unknown>).spartan_campaign
    if (typeof sc === "string" && sc.trim()) return sc.trim()
  }
  return null
}

function mergeDonationRows(target: Map<string, DonationSelectRow>, batch: DonationSelectRow[] | null | undefined) {
  for (const row of batch ?? []) {
    const id = typeof row.id === "string" ? row.id : ""
    if (!id) continue
    target.set(id, row)
  }
}

function chunkArr<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Aligns with `publicSupporterDisplayName` (Stripe) using mirror `raw_metadata` + row name. */
function mirrorRowPublicDonorLabel(row: DonationSelectRow): string {
  const meta = row.raw_metadata
  const m = meta && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, string>) : {}
  const v = m.donor_list_public
  const donorListPublic = !(v === "false" || v === "0" || v === "no")
  if (!donorListPublic) return "Anonymous"
  const n =
    (typeof row.donor_name === "string" && row.donor_name.trim()
      ? row.donor_name.trim()
      : typeof m.donor_name === "string" && m.donor_name.trim()
        ? m.donor_name.trim()
        : "")
  if (n) return n
  return "Supporter"
}

/**
 * Ledger rows for this NCU code: credit corrections + default campaign scope (`spartan_donations`), newest first.
 * Athlete public pages use this instead of listing all Stripe Checkout Sessions (fast).
 */
async function fetchAthleteMirrorCreditedRows(
  admin: ReturnType<typeof createAdminClient>,
  codeUpper: string,
): Promise<DonationSelectRow[] | null> {
  const idx = await fetchSpartanCreditCorrectionsIndex(admin)

  const keysForC = new Set<string>()
  for (const [k, ac] of idx.athleteBySessionOrPi) {
    if ((ac ?? "").trim().toUpperCase() === codeUpper) keysForC.add(k)
  }
  const csIds = [...keysForC].filter((k) => k.startsWith("cs_"))
  const piIds = [...keysForC].filter((k) => k.startsWith("pi_"))

  const byId = new Map<string, DonationSelectRow>()
  const sel = `${DONATION_SELECT}, created_at, donor_name, spartan_campaign`

  const { data: byAthleteMeta, error: e1 } = await admin
    .from("spartan_donations")
    .select(sel)
    .eq("status", "paid")
    .ilike("athlete_code", codeUpper)

  if (e1) {
    console.warn("[athlete-public-stats]", e1.message)
    return null
  }
  mergeDonationRows(byId, byAthleteMeta as DonationSelectRow[])

  for (const part of chunkArr(csIds, 80)) {
    if (part.length === 0) continue
    const { data, error } = await admin.from("spartan_donations").select(sel).eq("status", "paid").in("id", part)
    if (error) console.warn("[athlete-public-stats] cs batch", error.message)
    mergeDonationRows(byId, data as DonationSelectRow[])
  }

  if (piIds.length > 0) {
    const orClause = piIds.map((pi) => `raw_metadata->stripe_payment_intent_id.eq.${pi}`).join(",")
    const { data, error } = await admin
      .from("spartan_donations")
      .select(sel)
      .eq("status", "paid")
      .or(orClause)
    if (error) console.warn("[athlete-public-stats] pi batch", error.message)
    mergeDonationRows(byId, data as DonationSelectRow[])
  }

  const credited: DonationSelectRow[] = []
  for (const row of byId.values()) {
    if (
      !hubSpartanDonationRowMatchesCampaign(
        spartanCampaignFromDonationMirrorRow(row),
        DEFAULT_FUNDRAISING_CAMPAIGN,
      )
    ) {
      continue
    }
    const eff = effectiveAthleteCodeForDonationLedgerRow(
      { id: row.id, athlete_code: row.athlete_code, raw_metadata: row.raw_metadata },
      idx,
    )
    if (eff === codeUpper) credited.push(row)
  }

  credited.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0))
  return credited
}

/**
 * Same roll-up as `/spartan` `byAthlete` (see `aggregateSpartanByAthlete`): corrected Stripe sessions in the
 * campaign window. Uses the **cached** full session list (same as the fundraising hub) so athlete pages stay fast;
 * numbers match Spartan within the cache window (default ~60–120s, see `RECRUITNC_FUNDRAISING_STRIPE_LIST_CACHE_SECONDS`).
 */
async function loadAthleteCreditedForPublic(
  codeUpper: string,
): Promise<
  | {
      source: "stripe"
      allCorrected: SpartanFayettevilleDonation[]
      mine: SpartanFayettevilleDonation[]
    }
  | { source: "mirror"; rows: DonationSelectRow[] }
  | null
> {
  const corrected = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (corrected != null) {
    const key = codeUpper.toLowerCase()
    const mine = corrected.filter((r) => (r.athleteCode ?? "").trim().toLowerCase() === key)
    return { source: "stripe", allCorrected: corrected, mine }
  }
  const mirror = await fetchAthleteMirrorCreditedRows(createAdminClient(), codeUpper)
  if (mirror == null) return null
  return { source: "mirror", rows: mirror }
}

/**
 * Identical cents + gift count as Spartan `byAthlete` for this NCU code (after credit corrections).
 */
function statsFromStripeCreditedForCode(
  allCorrected: SpartanFayettevilleDonation[],
  codeUpper: string,
): AthleteFundraisingPublicStats {
  const key = codeUpper.toLowerCase()
  const agg = aggregateSpartanByAthlete(allCorrected)
  const row = agg.find((a) => a.athleteCode.trim().toLowerCase() === key)
  const raisedCents = row?.totalCents ?? 0
  const giftCount = row?.donationCount ?? 0

  const mine = allCorrected.filter((r) => (r.athleteCode ?? "").trim().toLowerCase() === key)
  let organizationGiftCount = 0
  let individualGiftCount = 0
  for (const r of mine) {
    if (r.payerType === "organization") organizationGiftCount++
    else individualGiftCount++
  }
  return {
    raisedCents,
    giftCount,
    avgGiftCents: giftCount > 0 ? Math.round(raisedCents / giftCount) : null,
    organizationGiftCount,
    individualGiftCount,
    payerTypeBreakdownKnown: true,
  }
}

function giftsFromStripeCredited(rows: SpartanFayettevilleDonation[], limit: number): AthleteRecentGiftRow[] {
  const lim = Math.min(250, Math.max(1, limit))
  const sorted = [...rows].sort((a, b) => b.createdUnix - a.createdUnix)
  return sorted.slice(0, lim).map((row) => ({
    created_at: row.createdIso,
    donorLabel: publicSupporterDisplayName(row),
    amountCents: row.amountCents,
    campaignLabel: publicGiftCampaignLabel(row.spartanCampaignSlug, row.createdIso),
  }))
}

function statsFromMirrorCredited(credited: DonationSelectRow[]): AthleteFundraisingPublicStats {
  let raisedCents = 0
  for (const row of credited) {
    raisedCents += typeof row.amount_cents === "number" ? row.amount_cents : 0
  }
  const giftCount = credited.length
  return {
    raisedCents,
    giftCount,
    avgGiftCents: giftCount > 0 ? Math.round(raisedCents / giftCount) : null,
    organizationGiftCount: 0,
    individualGiftCount: 0,
    payerTypeBreakdownKnown: false,
  }
}

function giftsFromMirrorCredited(credited: DonationSelectRow[], limit: number): AthleteRecentGiftRow[] {
  const lim = Math.min(250, Math.max(1, limit))
  return credited.slice(0, lim).map((row) => ({
    created_at: String(row.created_at ?? ""),
    donorLabel: mirrorRowPublicDonorLabel(row),
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
    campaignLabel: publicGiftCampaignLabel(spartanCampaignFromDonationMirrorRow(row), String(row.created_at ?? "")),
  }))
}

/**
 * Paid gifts credited to this NCU code — same Stripe list + corrections and **same per-athlete rollup** as
 * `/api/spartan/supporters` / Spartan `byAthlete` (uncached). Falls back to `spartan_donations` when Stripe is unavailable.
 */
export async function getAthleteFundraisingPublicStats(code: string): Promise<AthleteFundraisingPublicStats | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null
  const loaded = await loadAthleteCreditedForPublic(c)
  if (loaded == null) return null
  return loaded.source === "stripe"
    ? statsFromStripeCreditedForCode(loaded.allCorrected, c)
    : statsFromMirrorCredited(loaded.rows)
}

export type AthleteRecentGiftRow = {
  created_at: string
  donorLabel: string
  amountCents: number
  /** Campaign / season label for the gift activity table. */
  campaignLabel: string
}

export async function getAthleteRecentGifts(code: string, limit: number): Promise<AthleteRecentGiftRow[]> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return []
  const loaded = await loadAthleteCreditedForPublic(c)
  if (loaded == null) return []
  return loaded.source === "stripe"
    ? giftsFromStripeCredited(loaded.mine, limit)
    : giftsFromMirrorCredited(loaded.rows, limit)
}

/**
 * Public totals + gift table: Stripe-first, **uncached** (Spartan-parity), mirror fallback only.
 */
export async function getAthleteFundraisingPublicSnapshot(
  code: string,
  giftLimit: number,
): Promise<{ stats: AthleteFundraisingPublicStats; gifts: AthleteRecentGiftRow[] } | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null
  const loaded = await loadAthleteCreditedForPublic(c)
  if (loaded == null) return null
  if (loaded.source === "stripe") {
    return {
      stats: statsFromStripeCreditedForCode(loaded.allCorrected, c),
      gifts: giftsFromStripeCredited(loaded.mine, giftLimit),
    }
  }
  return {
    stats: statsFromMirrorCredited(loaded.rows),
    gifts: giftsFromMirrorCredited(loaded.rows, giftLimit),
  }
}

export type AthleteOwnerThankYouRow = {
  createdIso: string
  donorName: string | null
  donorEmail: string | null
  donorPhone: string | null
  /** Race-path notification inbox when different from payer email — useful if parent paid. */
  notificationEmail: string | null
  amountCents: number
}

/**
 * Donor contact rows for the signed-in athlete owner only — same credit rules as public totals.
 * Phone is present only when Stripe Checkout collected it (often blank).
 */
export async function getAthleteOwnerThankYouRows(code: string): Promise<AthleteOwnerThankYouRow[]> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return []

  const corrected = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (corrected != null) {
    const mine = corrected.filter((r) => {
      const ac = (r.athleteCode ?? "").trim().toUpperCase()
      return ac === c && r.attribution !== "general_nc_united"
    })
    mine.sort((a, b) => b.createdUnix - a.createdUnix)
    return mine.map((r) => ({
      createdIso: r.createdIso,
      donorName: r.donorName?.trim() ? r.donorName.trim() : null,
      donorEmail: r.donorEmail?.trim() ? r.donorEmail.trim() : null,
      donorPhone: r.donorPhone?.trim() ? r.donorPhone.trim() : null,
      notificationEmail: r.spartanNotificationEmail?.trim() ? r.spartanNotificationEmail.trim() : null,
      amountCents: r.amountCents,
    }))
  }

  const admin = createAdminClient()
  const idx = await fetchSpartanCreditCorrectionsIndex(admin)

  const keysForC = new Set<string>()
  for (const [k, ac] of idx.athleteBySessionOrPi) {
    if ((ac ?? "").trim().toUpperCase() === c) keysForC.add(k)
  }
  const csIds = [...keysForC].filter((k) => k.startsWith("cs_"))
  const piIds = [...keysForC].filter((k) => k.startsWith("pi_"))

  type Row = DonationSelectRow & { donor_email?: string | null }
  const byId = new Map<string, Row>()
  const sel = `${DONATION_SELECT}, created_at, donor_name, donor_email`

  const { data: byAthleteMeta } = await admin.from("spartan_donations").select(sel).eq("status", "paid").ilike("athlete_code", c)
  mergeDonationRows(byId, byAthleteMeta as Row[])

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  for (const part of chunk(csIds, 80)) {
    if (part.length === 0) continue
    const { data } = await admin.from("spartan_donations").select(sel).eq("status", "paid").in("id", part)
    mergeDonationRows(byId, data as Row[])
  }

  if (piIds.length > 0) {
    const orClause = piIds.map((pi) => `raw_metadata->stripe_payment_intent_id.eq.${pi}`).join(",")
    const { data } = await admin.from("spartan_donations").select(sel).eq("status", "paid").or(orClause)
    mergeDonationRows(byId, data as Row[])
  }

  const credited: Row[] = []
  for (const row of byId.values()) {
    const eff = effectiveAthleteCodeForDonationLedgerRow(
      { id: row.id, athlete_code: row.athlete_code, raw_metadata: row.raw_metadata },
      idx,
    )
    if (eff === c) credited.push(row)
  }

  credited.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0))

  return credited.map((row) => ({
    createdIso: row.created_at ? new Date(row.created_at).toISOString() : "",
    donorName: typeof row.donor_name === "string" && row.donor_name.trim() ? row.donor_name.trim() : null,
    donorEmail: typeof row.donor_email === "string" && row.donor_email.trim() ? row.donor_email.trim() : null,
    donorPhone: null,
    notificationEmail: null,
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
  }))
}
