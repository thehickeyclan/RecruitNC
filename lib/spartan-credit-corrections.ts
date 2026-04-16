import type { SupabaseClient } from "@supabase/supabase-js"
import type { SpartanFayettevilleDonation } from "@/lib/spartan-fayetteville-stripe"

/**
 * When checkout metadata is wrong (e.g. manual name) and Stripe session metadata
 * cannot be changed after payment, map session_id → athlete_code in
 * `spartan_credit_corrections` and merge here for public + admin lists.
 */
export async function fetchSpartanCreditCorrectionsMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const { data, error } = await admin.from("spartan_credit_corrections").select("session_id, athlete_code")
    if (error) {
      console.error("[spartan_credit_corrections] fetch:", error.message)
      return map
    }
    for (const row of data ?? []) {
      const sid = typeof row.session_id === "string" ? row.session_id.trim() : ""
      const code = typeof row.athlete_code === "string" ? row.athlete_code.trim() : ""
      if (sid && code) map.set(sid, code)
    }
  } catch (e) {
    console.error("[spartan_credit_corrections]", e)
  }
  return map
}

export function applySpartanCreditCorrectionsToDonations(
  rows: SpartanFayettevilleDonation[],
  sessionIdToAthleteCode: Map<string, string>,
): SpartanFayettevilleDonation[] {
  if (sessionIdToAthleteCode.size === 0) return rows
  return rows.map((r) => {
    const code = sessionIdToAthleteCode.get(r.sessionId)
    if (!code?.trim()) return r
    return {
      ...r,
      athleteCode: code.trim(),
      manualCreditName: null,
      athleteDisplayName: null,
      attribution: "athlete",
    }
  })
}
