import { createAdminClient } from "@/lib/supabase/admin"
import {
  fetchSpartanCreditCorrectionsIndex,
  effectiveAthleteCodeForDonationLedgerRow,
} from "@/lib/spartan-credit-corrections"

const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

export type AthleteFundraisingPublicStats = {
  raisedCents: number
  giftCount: number
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
 * Paid `spartan_donations` credited to this NCU code **after** `spartan_credit_corrections`
 * (e.g. gifts realigned to NC United general fund no longer count toward the athlete).
 */
export async function getAthleteFundraisingPublicStats(code: string): Promise<AthleteFundraisingPublicStats | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null
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
  return { raisedCents, giftCount }
}

export type AthleteRecentGiftRow = {
  created_at: string
  donorLabel: string
  amountCents: number
}

export async function getAthleteRecentGifts(code: string, limit: number): Promise<AthleteRecentGiftRow[]> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return []
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

  const lim = Math.min(50, Math.max(1, limit))
  return credited.slice(0, lim).map((row) => ({
    created_at: String(row.created_at ?? ""),
    donorLabel:
      typeof row.donor_name === "string" && row.donor_name.trim() ? row.donor_name.trim() : "Supporter",
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
  }))
}
