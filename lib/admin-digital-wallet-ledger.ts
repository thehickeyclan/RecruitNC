import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { hubSpartanDonationRowMatchesAnyRegisteredCampaign } from "@/lib/fundraising/campaign-registry"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
} from "@/lib/spartan-credit-corrections"
import {
  getFundraisingAthleteEntries,
  type FundraisingAthleteEntry,
} from "@/lib/spartan-fundraising-code"
import { getTrainingFundPublicSnapshot } from "@/lib/fundraising/training-fund-public-stats"
import { buildParentSpartanFundraisingRowsForAthleteIds } from "@/lib/parent-spartan-fundraising-totals"

const NCU_CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

export const NCU_TRAINING_FUND_LEDGER_ID = "__pool_ncu_training_fund__"

export type AdminDigitalWalletLedgerRow = {
  rowKind: "athlete" | "pool"
  /** Athlete id, or {@link NCU_TRAINING_FUND_LEDGER_ID} for the training fund pool. */
  athleteId: string
  poolKey?: "ncu_training_fund"
  name: string
  slug: string | null
  fundraisingCode: string | null
  raisedCents: number
  reimbursementsPaidCents: number
  guildAllocationsCents: number
  /**
   * Obligated moves from pooled operating money — training fund → named scholarships (admin allocations).
   * Athlete rows: 0.
   */
  programOutflowsCents: number
  /** Athlete: wallet remaining. Training fund: unallocated after scholarship moves (same as public training fund page). */
  availableCents: number
  giftCount: number
  codeUnavailable?: boolean
}

export type AdminDigitalWalletLedgerTotals = {
  rowCount: number
  raisedCents: number
  reimbursementsPaidCents: number
  guildAllocationsCents: number
  programOutflowsCents: number
  availableCents: number
  giftCount: number
}

/** Registry-wide sanity check: all paid Spartan mirror gifts in active campaigns. */
export type AdminDigitalWalletLedgerSummary = {
  registryCampaignPaidTotalCents: number
  /** Athlete-allocated + training-fund gross (should align with registry total when attribution is complete). */
  combinedAttributedRaisedCents: number
  /** registry − combined (uncategorized / attribution gaps / timing). */
  unattributedVarianceCents: number
}

function spartanCampaignFromPaidMirrorRow(row: {
  spartan_campaign?: string | null
  raw_metadata?: unknown
}): string | null {
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

function athleteIdsForNcuCode(entries: FundraisingAthleteEntry[], codeUpper: string): string[] {
  const out: string[] = []
  for (const e of entries) {
    if (e.id.startsWith("spartan-fundraising:")) continue
    const c = (e.code ?? "").trim().toUpperCase()
    if (c === codeUpper) out.push(e.id)
  }
  return out
}

/**
 * Athletes who have at least one **registry-scoped** paid `spartan_donations` row that credits them
 * (NCU → fundraising roster, or `fundraising_athlete_slug` → profile).
 */
export async function collectAthleteIdsWithCreditedPaidDonations(client: SupabaseClient): Promise<string[]> {
  const idx = await fetchSpartanCreditCorrectionsIndex(client)
  const entries = await getFundraisingAthleteEntries(client)
  const ids = new Set<string>()
  const slugs = new Set<string>()

  const pageSize = 500
  let offset = 0
  for (;;) {
    const { data, error } = await client
      .from("spartan_donations")
      .select("id, athlete_code, raw_metadata, fundraising_athlete_slug, spartan_campaign")
      .eq("status", "paid")
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(error.message)
    }
    const batch = data ?? []
    if (batch.length === 0) break

    for (const raw of batch) {
      const row = raw as {
        id: string
        athlete_code: string | null
        raw_metadata?: unknown
        fundraising_athlete_slug?: string | null
        spartan_campaign?: string | null
      }
      if (!hubSpartanDonationRowMatchesAnyRegisteredCampaign(spartanCampaignFromPaidMirrorRow(row))) {
        continue
      }

      const eff = effectiveAthleteCodeForDonationLedgerRow(
        { id: row.id, athlete_code: row.athlete_code, raw_metadata: row.raw_metadata },
        idx,
      )
      if (eff && NCU_CODE_RE.test(eff)) {
        for (const aid of athleteIdsForNcuCode(entries, eff)) {
          ids.add(aid)
        }
      }

      const fs = row.fundraising_athlete_slug?.trim().toLowerCase()
      if (fs) slugs.add(fs)
    }

    offset += batch.length
    if (batch.length < pageSize) break
  }

  if (slugs.size > 0) {
    const slugList = [...slugs]
    const chunk = 30
    for (let i = 0; i < slugList.length; i += chunk) {
      const part = slugList.slice(i, i + chunk)
      const orClause = part.map((s) => `slug.ilike.${s}`).join(",")
      const { data: profs, error: pe } = await client
        .from("athlete_fundraising_profiles")
        .select("athlete_id")
        .or(orClause)
      if (pe) {
        console.warn("[admin-digital-wallet-ledger] slug→athlete", pe.message)
        continue
      }
      for (const p of profs ?? []) {
        const aid = typeof (p as { athlete_id?: string }).athlete_id === "string"
          ? (p as { athlete_id: string }).athlete_id.trim()
          : ""
        if (aid) ids.add(aid)
      }
    }
  }

  return [...ids]
}

/** Gross paid cents in `spartan_donations` for registered campaigns (same scope as hub / wallet). */
export async function sumRegistryCampaignPaidMirrorTotalCents(client: SupabaseClient): Promise<number> {
  let total = 0
  const pageSize = 1000
  let offset = 0
  for (;;) {
    const { data, error } = await client
      .from("spartan_donations")
      .select("amount_cents, raw_metadata, spartan_campaign")
      .eq("status", "paid")
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.warn("[admin-digital-wallet-ledger] registry sum", error.message)
      return total
    }
    const batch = data ?? []
    if (batch.length === 0) break
    for (const raw of batch) {
      const row = raw as {
        amount_cents?: number | null
        raw_metadata?: unknown
        spartan_campaign?: string | null
      }
      if (!hubSpartanDonationRowMatchesAnyRegisteredCampaign(spartanCampaignFromPaidMirrorRow(row))) continue
      const n = typeof row.amount_cents === "number" ? row.amount_cents : 0
      total += n
    }
    offset += batch.length
    if (batch.length < pageSize) break
  }
  return total
}

async function buildSlugByAthleteId(
  client: SupabaseClient,
  athleteIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (athleteIds.length === 0) return out

  const chunk = 120
  for (let i = 0; i < athleteIds.length; i += chunk) {
    const part = athleteIds.slice(i, i + chunk)
    const { data, error } = await client
      .from("athlete_fundraising_profiles")
      .select("athlete_id, slug, is_active")
      .in("athlete_id", part)
    if (error) {
      console.warn("[admin-digital-wallet-ledger] profiles for slug", error.message)
      continue
    }
    const rows = [...(data ?? [])].sort(
      (a, b) =>
        Number((b as { is_active?: boolean }).is_active === true) -
        Number((a as { is_active?: boolean }).is_active === true),
    )
    for (const r of rows) {
      const aid = String((r as { athlete_id?: string }).athlete_id ?? "")
      const slug = typeof (r as { slug?: string }).slug === "string" ? (r as { slug: string }).slug.trim() : ""
      if (aid && slug && !out.has(aid)) {
        out.set(aid, slug)
      }
    }
  }
  return out
}

/**
 * Full attributed picture: **athletes** (wallet basis) plus the **NC United Training Fund** pool
 * (same definitions as `/fundraising/training-fund` + scholarship allocations).
 */
export async function fetchAdminDigitalWalletLedger(
  admin?: SupabaseClient,
): Promise<{
  rows: AdminDigitalWalletLedgerRow[]
  totals: AdminDigitalWalletLedgerTotals
  summary: AdminDigitalWalletLedgerSummary
}> {
  const client = admin ?? createAdminClient()

  const [athleteIdOrder, registryCampaignPaidTotalCents, trainingSnap] = await Promise.all([
    collectAthleteIdsWithCreditedPaidDonations(client),
    sumRegistryCampaignPaidMirrorTotalCents(client),
    getTrainingFundPublicSnapshot(1),
  ])

  const slugByAthleteId = await buildSlugByAthleteId(client, athleteIdOrder)

  const built = await buildParentSpartanFundraisingRowsForAthleteIds(
    client,
    "__admin_wallet_ledger__",
    athleteIdOrder,
    { fundraisingProfiles: "any" },
  )

  const athleteRows: AdminDigitalWalletLedgerRow[] = built
    .map((r) => {
      const availableCents = r.netAfterReimbursementsCents - r.guildAllocationsCents
      return {
        rowKind: "athlete" as const,
        athleteId: r.athleteId,
        name: r.name,
        slug: slugByAthleteId.get(r.athleteId) ?? null,
        fundraisingCode: r.fundraisingCode,
        raisedCents: r.totalCents,
        reimbursementsPaidCents: r.reimbursementsPaidCents,
        guildAllocationsCents: r.guildAllocationsCents,
        programOutflowsCents: 0,
        availableCents,
        giftCount: r.giftCount,
        codeUnavailable: r.codeUnavailable,
      }
    })
    .filter((r) => r.raisedCents > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const tf = trainingSnap.stats
  const trainingRow: AdminDigitalWalletLedgerRow = {
    rowKind: "pool",
    poolKey: "ncu_training_fund",
    athleteId: NCU_TRAINING_FUND_LEDGER_ID,
    name: "NC United Training Fund",
    slug: null,
    fundraisingCode: null,
    raisedCents: tf.donationsReceivedCents,
    reimbursementsPaidCents: 0,
    guildAllocationsCents: 0,
    programOutflowsCents: tf.allocatedToScholarshipsCents,
    availableCents: tf.unallocatedBalanceCents,
    giftCount: tf.giftCount,
  }

  /** Training fund row first — non-profit pool with distinct obligations (scholarship allocations). */
  const rows: AdminDigitalWalletLedgerRow[] = [trainingRow, ...athleteRows]

  const totals: AdminDigitalWalletLedgerTotals = rows.reduce(
    (acc, r) => ({
      rowCount: acc.rowCount + 1,
      raisedCents: acc.raisedCents + r.raisedCents,
      reimbursementsPaidCents: acc.reimbursementsPaidCents + r.reimbursementsPaidCents,
      guildAllocationsCents: acc.guildAllocationsCents + r.guildAllocationsCents,
      programOutflowsCents: acc.programOutflowsCents + r.programOutflowsCents,
      availableCents: acc.availableCents + r.availableCents,
      giftCount: acc.giftCount + r.giftCount,
    }),
    {
      rowCount: 0,
      raisedCents: 0,
      reimbursementsPaidCents: 0,
      guildAllocationsCents: 0,
      programOutflowsCents: 0,
      availableCents: 0,
      giftCount: 0,
    },
  )

  const athleteRaisedSum = athleteRows.reduce((s, r) => s + r.raisedCents, 0)
  const combinedAttributedRaisedCents = athleteRaisedSum + tf.donationsReceivedCents
  const summary: AdminDigitalWalletLedgerSummary = {
    registryCampaignPaidTotalCents,
    combinedAttributedRaisedCents,
    unattributedVarianceCents: registryCampaignPaidTotalCents - combinedAttributedRaisedCents,
  }

  return { rows, totals, summary }
}
