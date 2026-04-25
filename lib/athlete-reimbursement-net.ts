import type { SupabaseClient } from "@supabase/supabase-js"
import { getFundraisingAthleteEntries } from "@/lib/spartan-fundraising-code"
import type { SpartanAthleteAggregate } from "@/lib/spartan-fayetteville-stripe"

export type SpartanAthleteWithReimbursementNet = SpartanAthleteAggregate & {
  /** Sum of completed payouts (status paid) in the same time window as donations lookback, matched by athlete. */
  reimbursementsPaidCents: number
  /** Raised minus reimbursements paid (can be negative if payouts exceed in-window raised). */
  netAfterReimbursementsCents: number
}

type ExpensePaidRow = {
  athlete_id: string
  amount_cents: number
  amount_approved_cents: number | null
  paid_at: string | null
  updated_at: string
}

/**
 * Per-athlete cents paid out (reimbursement status = paid) within [sinceMs, now].
 * Uses `paid_at` when set; otherwise falls back to `updated_at` for older rows.
 */
export async function fetchReimbursementPaidCentsByAthleteIdInWindow(
  admin: SupabaseClient,
  sinceMs: number,
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const { data, error } = await admin
    .from("athlete_expense_requests")
    .select("athlete_id, amount_cents, amount_approved_cents, paid_at, updated_at")
    .eq("status", "paid")

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.warn("[reimbursement-net] athlete_expense_requests not available")
      return map
    }
    console.error("[reimbursement-net] select paid reimbursements", error.message)
    return map
  }

  for (const raw of (data ?? []) as ExpensePaidRow[]) {
    const line = raw.amount_approved_cents ?? raw.amount_cents
    const t = raw.paid_at ? new Date(raw.paid_at).getTime() : new Date(raw.updated_at).getTime()
    if (Number.isNaN(t) || t < sinceMs) continue
    const id = raw.athlete_id
    map.set(id, (map.get(id) ?? 0) + line)
  }
  return map
}

/**
 * Map RecruitNC athlete UUID → NCU fundraising code (only athletes with a generated code in directory).
 */
function athleteIdToFundraisingCode(entries: Awaited<ReturnType<typeof getFundraisingAthleteEntries>>): Map<string, string> {
  const m = new Map<string, string>()
  for (const e of entries) {
    if (e.id.startsWith("spartan-fundraising:")) continue
    m.set(e.id, e.code)
  }
  return m
}

/**
 * Merge Stripe per-code aggregates with paid reimbursements so admin/parents see **net** after payouts.
 * Includes athletes who have reimbursements but $0 in-window donations.
 */
export async function mergeSpartanAggregatesWithReimbursementNet(
  admin: SupabaseClient,
  byAthlete: SpartanAthleteAggregate[],
  sinceMs: number,
): Promise<{
  rows: SpartanAthleteWithReimbursementNet[]
  totalReimbursementsPaidCents: number
}> {
  const [paidByAthleteId, entries] = await Promise.all([
    fetchReimbursementPaidCentsByAthleteIdInWindow(admin, sinceMs),
    getFundraisingAthleteEntries(admin),
  ])

  const idToCode = athleteIdToFundraisingCode(entries)
  const paidByCodeLower = new Map<string, number>()

  for (const [athleteId, cents] of paidByAthleteId) {
    const code = idToCode.get(athleteId)
    if (!code) {
      if (cents > 0) {
        console.warn("[reimbursement-net] paid reimbursement but no directory code for athlete_id", athleteId)
      }
      continue
    }
    const k = code.toLowerCase()
    paidByCodeLower.set(k, (paidByCodeLower.get(k) ?? 0) + cents)
  }

  const totalReimbursementsPaidCents = [...paidByCodeLower.values()].reduce((s, c) => s + c, 0)
  const seen = new Set<string>()
  const rows: SpartanAthleteWithReimbursementNet[] = []

  for (const a of byAthlete) {
    const k = a.athleteCode.trim().toLowerCase()
    seen.add(k)
    const paid = paidByCodeLower.get(k) ?? 0
    rows.push({
      ...a,
      reimbursementsPaidCents: paid,
      netAfterReimbursementsCents: a.totalCents - paid,
    })
  }

  for (const [codeLower, paid] of paidByCodeLower) {
    if (seen.has(codeLower)) continue
    const entry = entries.find((e) => e.code.toLowerCase() === codeLower)
    if (!entry) continue
    seen.add(codeLower)
    rows.push({
      athleteCode: entry.code,
      totalCents: 0,
      donationCount: 0,
      raceSignupCount: 0,
      reimbursementsPaidCents: paid,
      netAfterReimbursementsCents: 0 - paid,
    })
  }

  rows.sort((a, b) => b.netAfterReimbursementsCents - a.netAfterReimbursementsCents)

  return { rows, totalReimbursementsPaidCents }
}
