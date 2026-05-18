import type { SupabaseClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

import { createAdminClient } from "@/lib/supabase/admin"

export type FundraisingLedgerDirection = "money_in" | "money_out" | "internal_move"

export type FundraisingLedgerEntryKind =
  | "stripe_spartan_checkout"
  | "reimbursement_paid"
  | "training_fund_to_scholarship"
  | "guild_credit_allocation"

export type FundraisingLedgerRow = {
  id: string
  occurred_at: string
  recorded_at: string
  entry_kind: string
  direction: string
  amount_cents: number
  currency: string
  summary: string
  detail: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  scholarship_donation_id: string | null
  athlete_expense_request_id: string | null
  guild_credit_allocation_id: string | null
  scholarship_id: string | null
  athlete_id: string | null
  athlete_code: string | null
  bucket_from: string | null
  bucket_to: string | null
}

function isDuplicateLedgerError(err: { code?: string; message?: string }): boolean {
  return err.code === "23505" || Boolean(err.message?.includes("duplicate key"))
}

/** Insert ledger row; ignore unique violations (idempotent retries / webhook replay). */
async function insertLedgerIgnoreDup(admin: SupabaseClient, row: Record<string, unknown>): Promise<void> {
  const { error } = await admin.from("fundraising_ledger_entries").insert(row as never)
  if (!error) return
  if (isDuplicateLedgerError(error)) return
  console.warn("[fundraising-ledger] insert skipped:", error.message)
}

function formatUsdFromCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
}

/**
 * Paid Spartan-channel Stripe Checkout → money in (athlete credit or training fund).
 * Call after `spartan_donations` upsert succeeds.
 * @param resolvedAthleteCode When set, Stripe metadata omitted `athlete_code` but we resolved NCU from slug/URL (keeps ledger aligned with mirror).
 */
export async function recordFundraisingLedgerSpartanCheckout(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
  resolvedAthleteCode?: string | null,
): Promise<void> {
  if (session.metadata?.channel !== "spartan") return
  if (session.payment_status !== "paid") return
  const amountCents = session.amount_total ?? 0
  if (amountCents < 1) return

  const meta = session.metadata as Record<string, string>
  const athleteCodeRaw = ((resolvedAthleteCode ?? meta.athlete_code) || "").trim()
  const athleteCode = athleteCodeRaw ? athleteCodeRaw.toUpperCase() : null
  const manualName = (meta.manual_athlete_name || "").trim() || null

  const piRaw = session.payment_intent
  const stripePaymentIntentId =
    typeof piRaw === "string"
      ? piRaw
      : piRaw && typeof piRaw === "object" && "id" in piRaw
        ? String((piRaw as { id: string }).id)
        : null

  const usd = formatUsdFromCents(amountCents)
  let summary: string
  let bucketTo: string
  if (athleteCode) {
    summary = `Stripe gift ${usd} — credited athlete ${athleteCode}`
    bucketTo = "athlete_fundraising"
  } else if (manualName && manualName.length >= 2) {
    summary = `Stripe gift ${usd} — manual athlete credit (${manualName.slice(0, 48)})`
    bucketTo = "athlete_fundraising_manual"
  } else {
    summary = `Stripe gift ${usd} — NC United Training Fund`
    bucketTo = "training_fund"
  }

  const occurredAt = new Date(session.created * 1000).toISOString()

  await insertLedgerIgnoreDup(admin, {
    occurred_at: occurredAt,
    entry_kind: "stripe_spartan_checkout",
    direction: "money_in",
    amount_cents: amountCents,
    currency: (session.currency ?? "usd").toLowerCase(),
    summary,
    detail: session.customer_details?.email ?? null,
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: stripePaymentIntentId,
    athlete_code: athleteCode,
    bucket_from: "stripe",
    bucket_to: bucketTo,
    metadata: {
      spartan_campaign: meta.spartan_campaign ?? null,
      fundraising_type: meta.fundraising_type ?? null,
      donor_name: meta.donor_name ?? session.customer_details?.name ?? null,
    },
  })
}

export async function recordFundraisingLedgerReimbursementPaid(
  admin: SupabaseClient,
  params: {
    expenseRequestId: string
    athleteId: string
    amountCents: number
    detail?: string | null
  },
): Promise<void> {
  const { expenseRequestId, athleteId, amountCents, detail } = params
  if (!expenseRequestId || amountCents < 1) return

  const usd = formatUsdFromCents(amountCents)
  await insertLedgerIgnoreDup(admin, {
    occurred_at: new Date().toISOString(),
    entry_kind: "reimbursement_paid",
    direction: "money_out",
    amount_cents: amountCents,
    currency: "usd",
    summary: `Reimbursement paid ${usd} (athlete expense)`,
    detail: detail ?? null,
    athlete_expense_request_id: expenseRequestId,
    athlete_id: athleteId,
    bucket_from: "athlete_fundraising",
    bucket_to: "recipient",
    metadata: {},
  })
}

export async function recordFundraisingLedgerTrainingFundToScholarship(
  admin: SupabaseClient,
  params: {
    scholarshipDonationId: string
    scholarshipId: string
    scholarshipName: string
    scholarshipSlug: string
    amountCents: number
    note: string | null
    actorUserId: string
  },
): Promise<void> {
  const {
    scholarshipDonationId,
    scholarshipId,
    scholarshipName,
    scholarshipSlug,
    amountCents,
    note,
    actorUserId,
  } = params
  if (!scholarshipDonationId || amountCents < 1) return

  const usd = formatUsdFromCents(amountCents)
  await insertLedgerIgnoreDup(admin, {
    occurred_at: new Date().toISOString(),
    entry_kind: "training_fund_to_scholarship",
    direction: "internal_move",
    amount_cents: amountCents,
    currency: "usd",
    summary: `Training fund → scholarship “${scholarshipName}” (${usd})`,
    detail: note,
    scholarship_donation_id: scholarshipDonationId,
    scholarship_id: scholarshipId,
    bucket_from: "training_fund",
    bucket_to: `scholarship:${scholarshipSlug}`,
    created_by_user_id: actorUserId,
    metadata: { scholarship_slug: scholarshipSlug },
  })
}

export async function recordFundraisingLedgerGuildAllocation(
  admin: SupabaseClient,
  params: {
    guildCreditAllocationId: string
    athleteId: string
    recruitNcUserId: string
    amountCents: number
    campaign?: string | null
  },
): Promise<void> {
  const { guildCreditAllocationId, athleteId, recruitNcUserId, amountCents, campaign } = params
  if (!guildCreditAllocationId || amountCents < 1) return

  const usd = formatUsdFromCents(amountCents)
  await insertLedgerIgnoreDup(admin, {
    occurred_at: new Date().toISOString(),
    entry_kind: "guild_credit_allocation",
    direction: "internal_move",
    amount_cents: amountCents,
    currency: "usd",
    summary: `Athlete fundraising → Guild credits (${usd})`,
    detail: null,
    guild_credit_allocation_id: guildCreditAllocationId,
    athlete_id: athleteId,
    bucket_from: "athlete_fundraising",
    bucket_to: "guild_credits",
    metadata: {
      recruit_nc_user_id: recruitNcUserId,
      campaign: campaign ?? null,
    },
  })
}

const LEDGER_LIST_COLUMNS =
  "id, occurred_at, recorded_at, entry_kind, direction, amount_cents, currency, summary, detail, stripe_checkout_session_id, stripe_payment_intent_id, scholarship_donation_id, athlete_expense_request_id, guild_credit_allocation_id, scholarship_id, athlete_id, athlete_code, bucket_from, bucket_to"

const LEDGER_EXPORT_COLUMNS =
  `${LEDGER_LIST_COLUMNS}, metadata, created_by_user_id`

const EXPORT_PAGE_SIZE = 1000
/** Upper bound so exports cannot accidentally exhaust memory on misconfigured instances. */
const EXPORT_MAX_PAGES = 600

export type FundraisingLedgerExportRow = FundraisingLedgerRow & {
  metadata: Record<string, unknown> | null
  created_by_user_id: string | null
}

export async function listFundraisingLedgerEntries(limit: number): Promise<FundraisingLedgerRow[]> {
  const admin = createAdminClient()
  const lim = Math.min(500, Math.max(1, limit))
  const { data, error } = await admin
    .from("fundraising_ledger_entries")
    .select(LEDGER_LIST_COLUMNS)
    .order("occurred_at", { ascending: false })
    .limit(lim)

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return []
    }
    console.warn("[fundraising-ledger] list:", error.message)
    return []
  }
  return (data ?? []) as FundraisingLedgerRow[]
}

function csvEscape(cell: string | number | null | undefined): string {
  if (cell === null || cell === undefined) return ""
  const s = String(cell)
  if (/[\r\n",]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function metadataToCsvCell(metadata: unknown): string {
  if (metadata == null) return ""
  if (typeof metadata === "object") {
    try {
      return csvEscape(JSON.stringify(metadata))
    } catch {
      return ""
    }
  }
  return csvEscape(String(metadata))
}

const CSV_HEADERS = [
  "id",
  "occurred_at",
  "recorded_at",
  "entry_kind",
  "direction",
  "amount_cents",
  "currency",
  "summary",
  "detail",
  "stripe_checkout_session_id",
  "stripe_payment_intent_id",
  "scholarship_donation_id",
  "athlete_expense_request_id",
  "guild_credit_allocation_id",
  "scholarship_id",
  "athlete_id",
  "athlete_code",
  "bucket_from",
  "bucket_to",
  "metadata_json",
  "created_by_user_id",
] as const

function ledgerExportRowToLine(row: FundraisingLedgerExportRow): string {
  return [
    csvEscape(row.id),
    csvEscape(row.occurred_at),
    csvEscape(row.recorded_at),
    csvEscape(row.entry_kind),
    csvEscape(row.direction),
    csvEscape(row.amount_cents),
    csvEscape(row.currency),
    csvEscape(row.summary),
    csvEscape(row.detail),
    csvEscape(row.stripe_checkout_session_id),
    csvEscape(row.stripe_payment_intent_id),
    csvEscape(row.scholarship_donation_id),
    csvEscape(row.athlete_expense_request_id),
    csvEscape(row.guild_credit_allocation_id),
    csvEscape(row.scholarship_id),
    csvEscape(row.athlete_id),
    csvEscape(row.athlete_code),
    csvEscape(row.bucket_from),
    csvEscape(row.bucket_to),
    metadataToCsvCell(row.metadata),
    csvEscape(row.created_by_user_id),
  ].join(",")
}

/**
 * Full ledger export for audits: every row, every column, oldest-first.
 * Paginates through PostgREST limits; capped at EXPORT_PAGE_SIZE × EXPORT_MAX_PAGES rows.
 */
export async function buildFundraisingLedgerCsvExport(): Promise<{ csv: string; rowCount: number; truncated: boolean }> {
  const admin = createAdminClient()
  const headerLine = CSV_HEADERS.join(",")
  const lines: string[] = [headerLine]
  let rowCount = 0
  let truncated = false

  for (let page = 0; page < EXPORT_MAX_PAGES; page++) {
    const from = page * EXPORT_PAGE_SIZE
    const to = from + EXPORT_PAGE_SIZE - 1
    const { data, error } = await admin
      .from("fundraising_ledger_entries")
      .select(LEDGER_EXPORT_COLUMNS)
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return { csv: `\uFEFF${headerLine}\n`, rowCount: 0, truncated: false }
      }
      throw new Error(error.message)
    }

    const batch = (data ?? []) as FundraisingLedgerExportRow[]
    if (batch.length === 0) break

    for (const row of batch) {
      lines.push(ledgerExportRowToLine(row))
      rowCount++
    }

    if (batch.length < EXPORT_PAGE_SIZE) break
    if (page === EXPORT_MAX_PAGES - 1) {
      truncated = true
      break
    }
  }

  return { csv: `\uFEFF${lines.join("\n")}\n`, rowCount, truncated }
}
