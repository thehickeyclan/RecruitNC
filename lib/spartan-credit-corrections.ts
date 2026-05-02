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

function matchesGeneralFund(
  r: SpartanFayettevilleDonation,
  generalFundSessionOrPi: Set<string>,
): boolean {
  const sid = r.sessionId?.trim()
  if (sid && generalFundSessionOrPi.has(sid)) return true
  const pi = r.paymentIntentId?.trim()
  if (pi && generalFundSessionOrPi.has(pi)) return true
  return false
}

function correctionCodeForRow(
  r: SpartanFayettevilleDonation,
  sessionIdOrPiToAthleteCode: Map<string, string>,
): string | undefined {
  const bySession = sessionIdOrPiToAthleteCode.get(r.sessionId)
  if (bySession?.trim()) return bySession.trim()
  const pi = r.paymentIntentId?.trim()
  if (pi) {
    const byPi = sessionIdOrPiToAthleteCode.get(pi)
    if (byPi?.trim()) return byPi.trim()
  }
  return undefined
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
