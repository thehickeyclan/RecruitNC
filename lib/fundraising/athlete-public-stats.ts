import { cache } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
  matchesGeneralFundLedgerIds,
  stripePaymentIntentIdFromDonationRawMetadata,
} from "@/lib/spartan-credit-corrections"
import {
  DEFAULT_FUNDRAISING_CAMPAIGN,
  hubSpartanDonationRowMatchesAnyRegisteredCampaign,
  hubSpartanDonationRowMatchesCampaign,
} from "@/lib/fundraising/campaign-registry"
import {
  publicGiftCampaignLabelWithCheckoutSurface,
  resolveFundraisingCheckoutSurface,
} from "@/lib/fundraising/hub-activity-meta"
import { loadCorrectedStripeDonationsForCampaignWindow, loadCorrectedStripeDonationsForSpartanPublicWindow } from "@/lib/fundraising/stripe-transparency-pipeline"
import type { SpartanFayettevilleDonation } from "@/lib/spartan-fayetteville-stripe"

const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

export type AthleteFundraisingPublicStats = {
  raisedCents: number
  giftCount: number
  /** Paid sessions with race entry flag — same rollup as Spartan `byAthlete` when sourced from Stripe. */
  raceSignupCount: number
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
  donor_email?: string | null
  spartan_campaign?: string | null
  fundraising_checkout_surface?: string | null
  fundraising_athlete_slug?: string | null
}

const DONATION_SELECT = "id, athlete_code, amount_cents, raw_metadata, fundraising_checkout_surface, fundraising_athlete_slug"

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

/** Public donor label from mirror `raw_metadata` + row name (privacy flags respected). */
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
  opts?: { allRegisteredCampaigns?: boolean },
): Promise<DonationSelectRow[] | null> {
  const idx = await fetchSpartanCreditCorrectionsIndex(admin)

  const keysForC = new Set<string>()
  for (const [k, ac] of idx.athleteBySessionOrPi) {
    if ((ac ?? "").trim().toUpperCase() === codeUpper) keysForC.add(k)
  }
  const csIds = [...keysForC].filter((k) => k.startsWith("cs_"))
  const piIds = [...keysForC].filter((k) => k.startsWith("pi_"))

  const byId = new Map<string, DonationSelectRow>()
  const sel = `${DONATION_SELECT}, created_at, donor_name, donor_email, spartan_campaign`

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

  /** Legacy rows: NULL `athlete_code` column but code still in persisted Stripe metadata. */
  const metaOr = `raw_metadata->athlete_code.ilike.${codeUpper},raw_metadata->fundraising_code.ilike.${codeUpper}`
  const { data: byPersistedMetaKeys, error: eMetaKeys } = await admin
    .from("spartan_donations")
    .select(sel)
    .eq("status", "paid")
    .or(metaOr)
  if (eMetaKeys) {
    console.warn("[athlete-public-stats] raw_metadata NCU keys", eMetaKeys.message)
  } else {
    mergeDonationRows(byId, byPersistedMetaKeys as DonationSelectRow[])
  }

  const credited: DonationSelectRow[] = []
  for (const row of byId.values()) {
    const rowSlug = spartanCampaignFromDonationMirrorRow(row)
    const inCampaignScope = opts?.allRegisteredCampaigns
      ? hubSpartanDonationRowMatchesAnyRegisteredCampaign(rowSlug)
      : hubSpartanDonationRowMatchesCampaign(rowSlug, DEFAULT_FUNDRAISING_CAMPAIGN)
    if (!inCampaignScope) {
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

export type AthleteWalletMirrorOpts = {
  /** Profile URL slug(s) for this athlete — credits `fundraising_athlete_slug` when the column or metadata lacked the NCU. */
  mirrorFundraisingSlugs?: string[]
}

type MirrorCreditedOpts = { allRegisteredCampaigns?: boolean; mirrorFundraisingSlugs?: string[] }

async function mergePaidDonationsByProfileSlugs(
  admin: ReturnType<typeof createAdminClient>,
  merged: Map<string, DonationSelectRow>,
  codesUpper: string[],
  opts?: MirrorCreditedOpts,
): Promise<void> {
  const slugList = [...new Set((opts?.mirrorFundraisingSlugs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean))]
  if (slugList.length === 0) return

  const idx = await fetchSpartanCreditCorrectionsIndex(admin)
  const codesSet = new Set(codesUpper)
  const sel = `${DONATION_SELECT}, created_at, donor_name, donor_email, spartan_campaign`

  const orSlug = slugList.map((s) => `fundraising_athlete_slug.ilike.${s}`).join(",")
  const { data, error } = await admin.from("spartan_donations").select(sel).eq("status", "paid").or(orSlug)

  if (error) {
    console.warn("[athlete-public-stats] fundraising_athlete_slug mirror", error.message)
    return
  }

  for (const row of data ?? []) {
    const rowCamp = spartanCampaignFromDonationMirrorRow(row as DonationSelectRow)
    const inCampaignScope = opts?.allRegisteredCampaigns
      ? hubSpartanDonationRowMatchesAnyRegisteredCampaign(rowCamp)
      : hubSpartanDonationRowMatchesCampaign(rowCamp, DEFAULT_FUNDRAISING_CAMPAIGN)
    if (!inCampaignScope) continue

    const sid = typeof row.id === "string" ? row.id.trim() : ""
    const pi = stripePaymentIntentIdFromDonationRawMetadata((row as DonationSelectRow).raw_metadata)
    if (matchesGeneralFundLedgerIds(sid, pi, idx.generalFundSessionOrPi)) continue

    const slugNorm = (row as DonationSelectRow).fundraising_athlete_slug?.trim().toLowerCase()
    if (!slugNorm || !slugList.includes(slugNorm)) continue

    const eff = effectiveAthleteCodeForDonationLedgerRow(
      {
        id: sid,
        athlete_code: (row as DonationSelectRow).athlete_code,
        raw_metadata: (row as DonationSelectRow).raw_metadata,
      },
      idx,
    )
    if (eff && !codesSet.has(eff)) continue

    merged.set(sid, row as DonationSelectRow)
  }
}

/** Same rules as single-code fetch; merges unique donation ids across codes (e.g. slug vs primary mismatch). */
async function fetchAthleteMirrorCreditedRowsMerged(
  admin: ReturnType<typeof createAdminClient>,
  codesUpper: string[],
  opts?: MirrorCreditedOpts,
): Promise<DonationSelectRow[] | null> {
  const merged = new Map<string, DonationSelectRow>()
  for (const c of codesUpper) {
    const rows = await fetchAthleteMirrorCreditedRows(admin, c, opts)
    if (rows == null) return null
    for (const r of rows) merged.set(r.id, r)
  }
  await mergePaidDonationsByProfileSlugs(admin, merged, codesUpper, opts)
  const out = [...merged.values()]
  out.sort((a, b) => +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0))
  return out
}

/**
 * Cached Stripe session list for **owner thank-you** flows (`getAthleteOwnerThankYouRows`). Public headline totals
 * and gift tables use `spartan_donations` mirror via {@link getAthleteFundraisingWalletSnapshot}.
 */
const loadCorrectedStripeForAthletePublicPage = cache(async (): Promise<SpartanFayettevilleDonation[] | null> => {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return null
  const fromSharedCache = await loadCorrectedStripeDonationsForCampaignWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
  if (fromSharedCache != null) return fromSharedCache
  return loadCorrectedStripeDonationsForSpartanPublicWindow(DEFAULT_FUNDRAISING_CAMPAIGN)
})

function sliceGiftRows<T>(sorted: T[], limit: number): T[] {
  if (!Number.isFinite(limit) || limit <= 0) return sorted
  return sorted.slice(0, Math.min(sorted.length, Math.max(1, limit)))
}

function statsFromMirrorCredited(credited: DonationSelectRow[]): AthleteFundraisingPublicStats {
  let raisedCents = 0
  let raceSignupCount = 0
  for (const row of credited) {
    raisedCents += typeof row.amount_cents === "number" ? row.amount_cents : 0
    const meta = row.raw_metadata && typeof row.raw_metadata === "object" && !Array.isArray(row.raw_metadata)
      ? (row.raw_metadata as Record<string, unknown>)
      : null
    if (meta && meta.race_entry_requested === "true") raceSignupCount++
  }
  const giftCount = credited.length
  return {
    raisedCents,
    giftCount,
    raceSignupCount,
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
  /** Campaign / season label for the gift activity table. */
  campaignLabel: string
}

function giftsFromMirrorCredited(credited: DonationSelectRow[], limit: number): AthleteRecentGiftRow[] {
  const sorted = [...credited].sort((a, b) => +new Date(String(b.created_at ?? "")) - +new Date(String(a.created_at ?? "")))
  return sliceGiftRows(sorted, limit).map((row) => {
    const created = String(row.created_at ?? "")
    return {
      created_at: created,
      donorLabel: mirrorRowPublicDonorLabel(row),
      amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
      campaignLabel: publicGiftCampaignLabelWithCheckoutSurface(
        spartanCampaignFromDonationMirrorRow(row),
        created,
        resolveFundraisingCheckoutSurface(row.fundraising_checkout_surface, row.raw_metadata),
      ),
    }
  })
}

/**
 * All paid `spartan_donations` rows credited to these NCU codes (credit corrections, every registered campaign,
 * all time). Same headline totals for Profile → Digital wallet and the public athlete gift page.
 */
export async function getAthleteFundraisingWalletSnapshot(
  ledgerCodesInput: string | string[],
  giftLimit: number,
  mirrorOpts?: AthleteWalletMirrorOpts,
): Promise<{ stats: AthleteFundraisingPublicStats; gifts: AthleteRecentGiftRow[] } | null> {
  const raw = Array.isArray(ledgerCodesInput) ? ledgerCodesInput : [ledgerCodesInput]
  const codes = [...new Set(raw.map((c) => c.trim().toUpperCase()).filter((c) => CODE_RE.test(c)))]
  if (codes.length === 0) return null
  const rows = await fetchAthleteMirrorCreditedRowsMerged(createAdminClient(), codes, {
    allRegisteredCampaigns: true,
    mirrorFundraisingSlugs: mirrorOpts?.mirrorFundraisingSlugs,
  })
  if (rows == null) return null
  return {
    stats: statsFromMirrorCredited(rows),
    gifts: giftsFromMirrorCredited(rows, giftLimit),
  }
}

export async function getAthleteFundraisingPublicStats(
  code: string,
  mirrorOpts?: AthleteWalletMirrorOpts,
): Promise<AthleteFundraisingPublicStats | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null
  const snap = await getAthleteFundraisingWalletSnapshot([c], 0, mirrorOpts)
  return snap?.stats ?? null
}

/** `giftLimit` ≤ 0 means return every gift (newest first). */
export const ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP = 0

export async function getAthleteRecentGifts(
  code: string,
  limit: number,
  mirrorOpts?: AthleteWalletMirrorOpts,
): Promise<AthleteRecentGiftRow[]> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return []
  const snap = await getAthleteFundraisingWalletSnapshot([c], limit, mirrorOpts)
  return snap?.gifts ?? []
}

/** Same data as {@link getAthleteFundraisingWalletSnapshot} — public goal/milestone stay aligned with family wallet. */
export async function getAthleteFundraisingPublicSnapshot(
  ledgerCodesInput: string | string[],
  giftLimit: number,
  mirrorOpts?: AthleteWalletMirrorOpts,
): Promise<{ stats: AthleteFundraisingPublicStats; gifts: AthleteRecentGiftRow[] } | null> {
  return getAthleteFundraisingWalletSnapshot(ledgerCodesInput, giftLimit, mirrorOpts)
}

export type AthleteOwnerThankYouRow = {
  /** Stable id for thank-you persistence (`cs_…`, `pi_…`, or rare legacy/mirror fallback). */
  ledgerKey: string
  createdIso: string
  donorName: string | null
  donorEmail: string | null
  donorPhone: string | null
  /** Race-path notification inbox when different from payer email — useful if parent paid. */
  notificationEmail: string | null
  amountCents: number
}

export type AthleteOwnerThankYouRowWithAck = AthleteOwnerThankYouRow & { thanked: boolean }

function ledgerKeyForStripeDonation(r: SpartanFayettevilleDonation): string {
  const cs = r.sessionId?.trim()
  if (cs?.startsWith("cs_")) return cs
  const pi = r.paymentIntentId?.trim()
  if (pi?.startsWith("pi_")) return pi
  const fallback = [
    r.createdIso,
    String(r.amountCents),
    (r.donorEmail ?? "").toLowerCase(),
    (r.spartanNotificationEmail ?? "").toLowerCase(),
    (r.donorPhone ?? "").trim(),
    (r.donorName ?? "").toLowerCase(),
  ].join("\0")
  return `legacy:${fallback}`
}

function ledgerKeyForMirrorDonationRow(row: { id?: string }): string {
  const id = typeof row.id === "string" ? row.id.trim() : ""
  if (id.startsWith("cs_")) return id
  if (id.startsWith("pi_")) return id
  if (id) return `mirror:${id}`
  return "mirror:missing"
}

/**
 * Donor contact rows for the signed-in athlete owner only — same credit rules as public totals.
 * Phone is present only when Stripe Checkout collected it (often blank).
 */
export async function getAthleteOwnerThankYouRows(code: string): Promise<AthleteOwnerThankYouRow[]> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return []

  const corrected = await loadCorrectedStripeForAthletePublicPage()
  if (corrected != null) {
    const mine = corrected.filter((r) => {
      const ac = (r.athleteCode ?? "").trim().toUpperCase()
      return ac === c && r.attribution !== "general_nc_united"
    })
    mine.sort((a, b) => b.createdUnix - a.createdUnix)
    return mine.map((r) => ({
      ledgerKey: ledgerKeyForStripeDonation(r),
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
    ledgerKey: ledgerKeyForMirrorDonationRow(row),
    createdIso: row.created_at ? new Date(row.created_at).toISOString() : "",
    donorName: typeof row.donor_name === "string" && row.donor_name.trim() ? row.donor_name.trim() : null,
    donorEmail: typeof row.donor_email === "string" && row.donor_email.trim() ? row.donor_email.trim() : null,
    donorPhone: null,
    notificationEmail: null,
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
  }))
}

/**
 * Same contact rows as owner thank-you flows, for every ledger code — when live Stripe is unavailable, uses the same
 * mirror + slug rules as {@link getAthleteFundraisingWalletSnapshot}.
 */
export async function getAthleteOwnerThankYouRowsForLedgerCodes(
  ledgerCodesInput: string | string[],
  mirrorOpts?: AthleteWalletMirrorOpts,
): Promise<AthleteOwnerThankYouRow[]> {
  const raw = Array.isArray(ledgerCodesInput) ? ledgerCodesInput : [ledgerCodesInput]
  const codes = [...new Set(raw.map((c) => c.trim().toUpperCase()).filter((c) => CODE_RE.test(c)))]
  if (codes.length === 0) return []

  const corrected = await loadCorrectedStripeForAthletePublicPage()
  if (corrected != null) {
    const codeSet = new Set(codes)
    const mine = corrected.filter((r) => {
      const ac = (r.athleteCode ?? "").trim().toUpperCase()
      return codeSet.has(ac) && r.attribution !== "general_nc_united"
    })
    mine.sort((a, b) => b.createdUnix - a.createdUnix)
    return mine.map((r) => ({
      ledgerKey: ledgerKeyForStripeDonation(r),
      createdIso: r.createdIso,
      donorName: r.donorName?.trim() ? r.donorName.trim() : null,
      donorEmail: r.donorEmail?.trim() ? r.donorEmail.trim() : null,
      donorPhone: r.donorPhone?.trim() ? r.donorPhone.trim() : null,
      notificationEmail: r.spartanNotificationEmail?.trim() ? r.spartanNotificationEmail.trim() : null,
      amountCents: r.amountCents,
    }))
  }

  return getAthleteOwnerThankYouRowsForWalletLedgerCodes(ledgerCodesInput, mirrorOpts)
}

/**
 * Thank-you list aligned with {@link getAthleteFundraisingWalletSnapshot}: mirror only, all registry campaigns, no day cap.
 */
export async function getAthleteOwnerThankYouRowsForWalletLedgerCodes(
  ledgerCodesInput: string | string[],
  mirrorOpts?: AthleteWalletMirrorOpts,
): Promise<AthleteOwnerThankYouRow[]> {
  const raw = Array.isArray(ledgerCodesInput) ? ledgerCodesInput : [ledgerCodesInput]
  const codes = [...new Set(raw.map((c) => c.trim().toUpperCase()).filter((c) => CODE_RE.test(c)))]
  if (codes.length === 0) return []
  const rows = await fetchAthleteMirrorCreditedRowsMerged(createAdminClient(), codes, {
    allRegisteredCampaigns: true,
    mirrorFundraisingSlugs: mirrorOpts?.mirrorFundraisingSlugs,
  })
  if (rows == null || rows.length === 0) return []

  const seen = new Set<string>()
  const out: AthleteOwnerThankYouRow[] = []
  for (const row of rows) {
    const ledgerKey = ledgerKeyForMirrorDonationRow(row)
    if (seen.has(ledgerKey)) continue
    seen.add(ledgerKey)
    out.push({
      ledgerKey,
      createdIso: row.created_at ? new Date(row.created_at).toISOString() : "",
      donorName: typeof row.donor_name === "string" && row.donor_name.trim() ? row.donor_name.trim() : null,
      donorEmail: typeof row.donor_email === "string" && row.donor_email.trim() ? row.donor_email.trim() : null,
      donorPhone: null,
      notificationEmail: null,
      amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
    })
  }
  out.sort((a, b) => +new Date(b.createdIso) - +new Date(a.createdIso))
  return out
}
