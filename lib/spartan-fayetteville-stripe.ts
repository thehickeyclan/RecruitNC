import Stripe from "stripe"

export const SPARTAN_FAYETTEVILLE_CAMPAIGN = "fayetteville_2026"
export const SPARTAN_STRIPE_LIST_MAX_PAGES = 80

export type SpartanFayettevilleDonation = {
  sessionId: string
  createdIso: string
  createdUnix: number
  amountCents: number
  currency: string
  donorEmail: string | null
  donorName: string | null
  /** From metadata donor_list_public — false = show as Anonymous on public lists */
  donorListPublic: boolean
  raceParticipant: boolean
  fundraisingType: "race_donation" | "gift_only"
  athleteCode: string | null
  /** When not in directory — metadata manual_credit_name */
  manualCreditName: string | null
  attribution: "athlete" | "general_nc_united" | "manual_name"
  tierPreference: string
}

export type SpartanAthleteAggregate = {
  athleteCode: string
  totalCents: number
  donationCount: number
  /** Sessions with race_entry_requested (Super 10K entry path) */
  raceSignupCount: number
}

function parseDonorListPublic(m: Record<string, string> | null | undefined): boolean {
  const v = m?.donor_list_public
  if (v === "false" || v === "0" || v === "no") return false
  if (v === "true" || v === "1" || v === "yes") return true
  return true
}

/**
 * Paid Checkout sessions for Spartan Fayetteville campaign (Stripe metadata).
 */
export async function listSpartanFayettevilleDonations(
  stripe: Stripe,
  createdGteUnix: number,
): Promise<SpartanFayettevilleDonation[]> {
  const rows: SpartanFayettevilleDonation[] = []
  let startingAfter: string | undefined
  let pages = 0

  while (pages < SPARTAN_STRIPE_LIST_MAX_PAGES) {
    const res = await stripe.checkout.sessions.list({
      created: { gte: createdGteUnix },
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const s of res.data) {
      if (s.payment_status !== "paid") continue
      const m = s.metadata || {}
      if (m.spartan_campaign !== SPARTAN_FAYETTEVILLE_CAMPAIGN) continue

      const raceRequested = m.race_entry_requested === "true"
      const ft = m.fundraising_type === "race_donation" ? "race_donation" : "gift_only"
      const athleteCode =
        typeof m.athlete_code === "string" && m.athlete_code.trim()
          ? m.athlete_code.trim()
          : typeof m.fundraising_code === "string" && m.fundraising_code.trim()
            ? m.fundraising_code.trim()
            : null
      const manualCreditName =
        typeof m.manual_credit_name === "string" && m.manual_credit_name.trim()
          ? m.manual_credit_name.trim().slice(0, 120)
          : null

      let attr: SpartanFayettevilleDonation["attribution"]
      if (m.fundraising_attribution === "manual_name") {
        attr = "manual_name"
      } else if (m.fundraising_attribution === "general_nc_united") {
        attr = "general_nc_united"
      } else if (athleteCode) {
        attr = "athlete"
      } else if (manualCreditName) {
        attr = "manual_name"
      } else {
        attr = "general_nc_united"
      }

      rows.push({
        sessionId: s.id,
        createdIso: new Date((s.created ?? 0) * 1000).toISOString(),
        createdUnix: s.created ?? 0,
        amountCents: s.amount_total ?? 0,
        currency: s.currency ?? "usd",
        donorEmail: s.customer_details?.email ?? s.customer_email ?? null,
        donorName: typeof m.donor_name === "string" && m.donor_name.trim() ? m.donor_name.trim() : null,
        donorListPublic: parseDonorListPublic(m),
        raceParticipant: raceRequested,
        fundraisingType: ft,
        athleteCode,
        manualCreditName,
        attribution: attr,
        tierPreference: typeof m.tier_preference === "string" ? m.tier_preference : "",
      })
    }

    pages++
    if (!res.has_more || res.data.length === 0) break
    startingAfter = res.data[res.data.length - 1]!.id
  }

  rows.sort((a, b) => b.createdUnix - a.createdUnix)
  return rows
}

export function aggregateSpartanByAthlete(rows: SpartanFayettevilleDonation[]): SpartanAthleteAggregate[] {
  const map = new Map<string, SpartanAthleteAggregate>()
  for (const r of rows) {
    if (!r.athleteCode?.trim()) continue
    const k = r.athleteCode.trim()
    const cur = map.get(k) ?? {
      athleteCode: k,
      totalCents: 0,
      donationCount: 0,
      raceSignupCount: 0,
    }
    cur.totalCents += r.amountCents
    cur.donationCount += 1
    if (r.raceParticipant) cur.raceSignupCount += 1
    map.set(k, cur)
  }
  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents)
}

/** Public-safe display name (no email). */
export function publicSupporterDisplayName(d: Pick<SpartanFayettevilleDonation, "donorListPublic" | "donorName">): string {
  if (!d.donorListPublic) return "Anonymous"
  const n = d.donorName?.trim()
  if (n) return n
  return "Supporter"
}
