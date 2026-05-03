import type { SupabaseClient } from "@supabase/supabase-js"
import type { SpartanFayettevilleDonation } from "@/lib/spartan-fayetteville-stripe"

/**
 * When checkout metadata is wrong and Stripe session metadata cannot be changed,
 * `spartan_credit_corrections` rows are merged in API (public + admin).
 * `session_id` = Checkout Session id (cs_…) or PaymentIntent id (pi_…).
 */
export type SpartanCreditCorrectionsIndex = {
  athleteBySessionOrPi: Map<string, string>
  /** Sessions / PIs forced to NC United community fund (not an individual wrestler). */
  generalFundSessionOrPi: Set<string>
}

async function fetchCorrectionsRows(
  admin: SupabaseClient,
): Promise<{ session_id: string; athlete_code: string | null; general_fund: boolean | null }[]> {
  let res = await admin.from("spartan_credit_corrections").select("session_id, athlete_code, general_fund")
  if (res.error) {
    const msg = res.error.message ?? ""
    if (msg.includes("general_fund") || res.error.code === "42703") {
      const legacy = await admin.from("spartan_credit_corrections").select("session_id, athlete_code")
      if (legacy.error) {
        console.error("[spartan_credit_corrections] fetch:", legacy.error.message)
        return []
      }
      return (legacy.data ?? []).map((row) => ({
        session_id: String((row as { session_id?: string }).session_id ?? ""),
        athlete_code: (row as { athlete_code?: string | null }).athlete_code ?? null,
        general_fund: false,
      }))
    }
    console.error("[spartan_credit_corrections] fetch:", res.error.message)
    return []
  }
  return (res.data ?? []) as { session_id: string; athlete_code: string | null; general_fund: boolean | null }[]
}

export async function fetchSpartanCreditCorrectionsIndex(admin: SupabaseClient): Promise<SpartanCreditCorrectionsIndex> {
  const athleteBySessionOrPi = new Map<string, string>()
  const generalFundSessionOrPi = new Set<string>()
  try {
    const rows = await fetchCorrectionsRows(admin)
    for (const row of rows) {
      const sid = typeof row.session_id === "string" ? row.session_id.trim() : ""
      if (!sid) continue
      if (row.general_fund === true) {
        generalFundSessionOrPi.add(sid)
        continue
      }
      const code = typeof row.athlete_code === "string" ? row.athlete_code.trim() : ""
      if (code) athleteBySessionOrPi.set(sid, code)
    }
  } catch (e) {
    console.error("[spartan_credit_corrections]", e)
  }
  return { athleteBySessionOrPi, generalFundSessionOrPi }
}

/** @deprecated Prefer fetchSpartanCreditCorrectionsIndex + applySpartanCreditCorrectionsToDonations */
export async function fetchSpartanCreditCorrectionsMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const idx = await fetchSpartanCreditCorrectionsIndex(admin)
  return idx.athleteBySessionOrPi
}

export type SpartanDonationLedgerRow = {
  /** Checkout session id (`cs_…`) — same as `spartan_donations.id`. */
  id: string
  athlete_code: string | null
  /** Webhook persists `stripe_payment_intent_id` here for PI-keyed corrections. */
  raw_metadata?: unknown
}

export function stripePaymentIntentIdFromDonationRawMetadata(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const v = (raw as Record<string, unknown>).stripe_payment_intent_id
  return typeof v === "string" && v.trim() ? v.trim() : null
}

/** True when ops marked this checkout / PI as NC United general fund (not an individual credit). */
export function matchesGeneralFundLedgerIds(
  sessionId: string,
  paymentIntentId: string | null,
  generalFundSessionOrPi: Set<string>,
): boolean {
  const sid = sessionId?.trim()
  if (sid && generalFundSessionOrPi.has(sid)) return true
  const pi = paymentIntentId?.trim()
  if (pi && generalFundSessionOrPi.has(pi)) return true
  return false
}

/**
 * Effective credited NCU code for a `spartan_donations` row — same outcome as applying
 * `applySpartanCreditCorrectionsToDonations` on live Stripe rows (general fund + re-credit).
 */
export function effectiveAthleteCodeForDonationLedgerRow(
  row: SpartanDonationLedgerRow,
  index: SpartanCreditCorrectionsIndex,
): string | null {
  const sid = (row.id ?? "").trim()
  const pi = stripePaymentIntentIdFromDonationRawMetadata(row.raw_metadata)
  if (matchesGeneralFundLedgerIds(sid, pi, index.generalFundSessionOrPi)) return null
  const corrected = correctionAthleteCodeFromIndex(sid, pi, index.athleteBySessionOrPi)
  if (corrected) return corrected.toUpperCase()
  const raw = row.athlete_code?.trim()
  return raw ? raw.toUpperCase() : null
}

function correctionAthleteCodeFromIndex(
  sessionId: string,
  paymentIntentId: string | null,
  sessionIdOrPiToAthleteCode: Map<string, string>,
): string | undefined {
  const bySession = sessionIdOrPiToAthleteCode.get(sessionId)
  if (bySession?.trim()) return bySession.trim()
  const pi = paymentIntentId?.trim()
  if (pi) {
    const byPi = sessionIdOrPiToAthleteCode.get(pi)
    if (byPi?.trim()) return byPi.trim()
  }
  return undefined
}

function matchesGeneralFund(
  r: SpartanFayettevilleDonation,
  generalFundSessionOrPi: Set<string>,
): boolean {
  return matchesGeneralFundLedgerIds(
    (r.sessionId ?? "").trim(),
    r.paymentIntentId?.trim() ?? null,
    generalFundSessionOrPi,
  )
}

function correctionCodeForRow(
  r: SpartanFayettevilleDonation,
  sessionIdOrPiToAthleteCode: Map<string, string>,
): string | undefined {
  return correctionAthleteCodeFromIndex(
    (r.sessionId ?? "").trim(),
    r.paymentIntentId?.trim() ?? null,
    sessionIdOrPiToAthleteCode,
  )
}

export function applySpartanCreditCorrectionsToDonations(
  rows: SpartanFayettevilleDonation[],
  index: SpartanCreditCorrectionsIndex | Map<string, string>,
): SpartanFayettevilleDonation[] {
  const resolved: SpartanCreditCorrectionsIndex =
    index instanceof Map
      ? { athleteBySessionOrPi: index, generalFundSessionOrPi: new Set() }
      : index

  if (resolved.athleteBySessionOrPi.size === 0 && resolved.generalFundSessionOrPi.size === 0) return rows

  return rows.map((r) => {
    if (matchesGeneralFund(r, resolved.generalFundSessionOrPi)) {
      return {
        ...r,
        athleteCode: null,
        manualCreditName: null,
        athleteDisplayName: null,
        attribution: "general_nc_united",
      }
    }
    const code = correctionCodeForRow(r, resolved.athleteBySessionOrPi)
    if (!code?.trim()) return r
    return {
      ...r,
      athleteCode: code.trim(),
      manualCreditName: null,
      athleteDisplayName: r.athleteDisplayName,
      attribution: "athlete",
    }
  })
}
