import { createAdminClient } from "@/lib/supabase/admin"

const CODE_RE = /^NCU-[A-Za-z0-9]+-\d{2}$/i

export type AthleteFundraisingPublicStats = {
  raisedCents: number
  giftCount: number
}

/**
 * Paid Spartan rows credited to this NCU code (Stripe mirror). Corrections not applied — approx for donor-facing page.
 */
export async function getAthleteFundraisingPublicStats(code: string): Promise<AthleteFundraisingPublicStats | null> {
  const c = code.trim().toUpperCase()
  if (!CODE_RE.test(c)) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("spartan_donations")
    .select("amount_cents")
    .eq("status", "paid")
    .eq("athlete_code", c)

  if (error) {
    console.warn("[athlete-public-stats]", error.message)
    return null
  }

  let raisedCents = 0
  let giftCount = 0
  for (const row of data ?? []) {
    raisedCents += typeof row.amount_cents === "number" ? row.amount_cents : 0
    giftCount += 1
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
  const { data, error } = await admin
    .from("spartan_donations")
    .select("created_at, donor_name, amount_cents")
    .eq("status", "paid")
    .eq("athlete_code", c)
    .order("created_at", { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)))

  if (error) {
    console.warn("[athlete-recent-gifts]", error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    created_at: String(row.created_at ?? ""),
    donorLabel: (typeof row.donor_name === "string" && row.donor_name.trim()) ? row.donor_name.trim() : "Supporter",
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : 0,
  }))
}
