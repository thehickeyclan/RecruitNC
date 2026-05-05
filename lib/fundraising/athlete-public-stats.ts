import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
} from "@/lib/spartan-credit-corrections"
import { DEFAULT_FUNDRAISING_CAMPAIGN } from "@/lib/fundraising/campaign-registry"
import { loadCorrectedStripeDonationsForCampaignWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import { attachPublicSupporterFields } from "@/lib/spartan-public-supporter-feed"
import { fundraisingCodeToFullNameMap, getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"

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
}

const DONATION_SELECT = "id, athlete_code, amount_cents, raw_metadata"

function mergeDonationRows(target: Map<string, DonationSelectRow>, batch: DonationSelectRow[] | null | undefined) {
  for (const row of batch ?? []) {
    const id = typeof row.id === "string" ? row.id : ""
    if (!id) continue
    target.set(id, row)
  }
}

/**
 * Paid gifts credited to this NCU code for the default Spartan campaign lookback window — sourced from **live Stripe**
 * with the same corrections as `/spartan` and the fundraising hub. If `STRIPE_SECRET_KEY` is missing or listing fails,
 * falls back to `spartan_donations` (mirror may lag Stripe).
 */
export async function getAthleteFundraisingPublicStats(code: string): Promise<AthleteFundraisingPublicStats | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null

  const corrected = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (corrected != null) {
    let raisedCents = 0
    let giftCount = 0
    let organizationGiftCount = 0
    let individualGiftCount = 0
    for (const r of corrected) {
      if ((r.athleteCode ?? "").trim().toUpperCase() === c) {
        raisedCents += r.amountCents
        giftCount += 1
        if (r.payerType === "organization") organizationGiftCount += 1
        else individualGiftCount += 1
      }
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

  const admin = createAdminClient()
  const idx = await fetchSpartanCreditCorrectionsIndex(admin)

  const keysForC = new Set<string>()
  for (const [k, ac] of idx.athleteBySessionOrPi) {
    if ((ac ?? "").trim().toUpperCase() === c) keysForC.add(k)
  }

  const csIds = [...keysForC].filter((k) => k.startsWith("cs_"))
  const piIds = [...keysForC].filter((k) => k.startsWith("pi_"))

  const byId = new Map<string, DonationSelectRow>()

  const { data: byAthleteMeta, error: e1 } = await admin
    .from("spartan_donations")
    .select(DONATION_SELECT)
    .eq("status", "paid")
    .ilike("athlete_code", c)

  if (e1) {
    console.warn("[athlete-public-stats]", e1.message)
    return null
  }
  mergeDonationRows(byId, byAthleteMeta as DonationSelectRow[])

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  for (const part of chunk(csIds, 80)) {
    if (part.length === 0) continue
    const { data, error } = await admin.from("spartan_donations").select(DONATION_SELECT).eq("status", "paid").in("id", part)
    if (error) console.warn("[athlete-public-stats] cs batch", error.message)
    mergeDonationRows(byId, data as DonationSelectRow[])
  }

  if (piIds.length > 0) {
    const orClause = piIds.map((pi) => `raw_metadata->stripe_payment_intent_id.eq.${pi}`).join(",")
    const { data, error } = await admin
      .from("spartan_donations")
      .select(DONATION_SELECT)
      .eq("status", "paid")
      .or(orClause)
    if (error) console.warn("[athlete-public-stats] pi batch", error.message)
    mergeDonationRows(byId, data as DonationSelectRow[])
  }

  let raisedCents = 0
  let giftCount = 0
  for (const row of byId.values()) {
    const eff = effectiveAthleteCodeForDonationLedgerRow(
      { id: row.id, athlete_code: row.athlete_code, raw_metadata: row.raw_metadata },
      idx,
    )
    if (eff === c) {
      raisedCents += typeof row.amount_cents === "number" ? row.amount_cents : 0
      giftCount += 1
    }
  }
  return {
    raisedCents,
    giftCount,
    avgGiftCents: giftCount > 0 ? Math.round(raisedCents / giftCount) : null,
    organizationGiftCount: 0,
    individualGiftCount: 0,
    payerTypeBreakdownKnown: false,
  }
}

export type AthleteRecentGiftRow = {
  created_at: string
  donorLabel: string
  amountCents: number
}

export async function getAthleteRecentGifts(code: string, limit: number): Promise<AthleteRecentGiftRow[]> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return []

  const corrected = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (corrected != null) {
    const admin = createAdminClient()
    const entries = await getFundraisingAthleteEntries(admin)
    const codeToFullName = fundraisingCodeToFullNameMap(entries)
    const enriched = attachPublicSupporterFields(corrected, codeToFullName)
    const mine = enriched.filter((r) => (r.athleteCode ?? "").trim().toUpperCase() === c)
    mine.sort((a, b) => b.createdUnix - a.createdUnix)
    const lim = Math.min(250, Math.max(1, limit))
    return mine.slice(0, lim).map((r) => ({
      created_at: r.createdIso,
      donorLabel: r.publicDisplayName?.trim() ? r.publicDisplayName.trim() : "Supporter",
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

  const byId = new Map<string, DonationSelectRow>()
  const sel = `${DONATION_SELECT}, created_at, donor_name`

  const { data: byAthleteMeta } = await admin.from("spartan_donations").select(sel).eq("status", "paid").ilike("athlete_code", c)

  mergeDonationRows(byId, byAthleteMeta as DonationSelectRow[])

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  for (const part of chunk(csIds, 80)) {
    if (part.length === 0) continue
    const { data } = await admin.from("spartan_donations").select(sel).eq("status", "paid").in("id", part)
    mergeDonationRows(byId, data as DonationSelectRow[])
  }

  if (piIds.length > 0) {
    const orClause = piIds.map((pi) => `raw_metadata->stripe_payment_intent_id.eq.${pi}`).join(",")
    const { data } = await admin.from("spartan_donations").select(sel).eq("status", "paid").or(orClause)
    mergeDonationRows(byId, data as DonationSelectRow[])
  }

  const credited: DonationSelectRow[] = []
  for (const row of byId.values()) {
    const eff = effectiveAthleteCodeForDonationLedgerRow(
      { id: row.id, athlete_code: row.athlete_code, raw_metadata: row.raw_metadata },
      idx,
    )
    if (eff === c) credited.push(row)
  }

  credited.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0))

  const lim = Math.min(250, Math.max(1, limit))
  return credited.slice(0, lim).map((row) => ({
    created_at: String(row.created_at ?? ""),
    donorLabel:
      typeof row.donor_name === "string" && row.donor_name.trim() ? row.donor_name.trim() : "Supporter",
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
  }))
}

/**
 * One Stripe list pass for athlete pages: public stats + gift table (same credit rules as `/spartan`).
 */
export async function getAthleteFundraisingPublicSnapshot(
  code: string,
  giftLimit: number,
): Promise<{ stats: AthleteFundraisingPublicStats; gifts: AthleteRecentGiftRow[] } | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null

  const corrected = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (corrected != null) {
    const mine = corrected.filter((r) => (r.athleteCode ?? "").trim().toUpperCase() === c)
    const admin = createAdminClient()
    const entries = await getFundraisingAthleteEntries(admin)
    const codeToFullName = fundraisingCodeToFullNameMap(entries)
    let raisedCents = 0
    let organizationGiftCount = 0
    let individualGiftCount = 0
    for (const r of mine) {
      raisedCents += r.amountCents
      if (r.payerType === "organization") organizationGiftCount += 1
      else individualGiftCount += 1
    }
    const giftCount = mine.length
    const stats: AthleteFundraisingPublicStats = {
      raisedCents,
      giftCount,
      avgGiftCents: giftCount > 0 ? Math.round(raisedCents / giftCount) : null,
      organizationGiftCount,
      individualGiftCount,
      payerTypeBreakdownKnown: true,
    }
    mine.sort((a, b) => b.createdUnix - a.createdUnix)
    const lim = Math.min(250, Math.max(1, giftLimit))
    const slice = mine.slice(0, lim)
    const enriched = attachPublicSupporterFields(slice, codeToFullName)
    const gifts = enriched.map((r) => ({
      created_at: r.createdIso,
      donorLabel: r.publicDisplayName?.trim() ? r.publicDisplayName.trim() : "Supporter",
      amountCents: r.amountCents,
    }))
    return { stats, gifts }
  }

  const [stats, gifts] = await Promise.all([
    getAthleteFundraisingPublicStats(code),
    getAthleteRecentGifts(code, giftLimit),
  ])
  if (!stats) return null
  return { stats, gifts }
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
