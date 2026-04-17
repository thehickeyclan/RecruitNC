import Stripe from "stripe"

export const SPARTAN_FAYETTEVILLE_CAMPAIGN = "fayetteville_2026"
export const SPARTAN_STRIPE_LIST_MAX_PAGES = 80

export type SpartanFayettevilleDonation = {
  sessionId: string
  /** Stripe PaymentIntent id (pi_…) — for credit fixes keyed by PI when cs_ is hard to find */
  paymentIntentId: string | null
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
  /** Directory display name from checkout — metadata athlete_display_name */
  athleteDisplayName: string | null
  /** When not in directory — metadata manual_credit_name */
  manualCreditName: string | null
  /** Optional: who is running the race if different from donor (metadata race_participant_name) */
  raceParticipantName: string | null
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

function paymentIntentIdFromSession(s: Stripe.Checkout.Session): string | null {
  const pi = s.payment_intent
  if (!pi) return null
  if (typeof pi === "string") return pi
  return pi.id ?? null
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
      expand: ["data.payment_intent"],
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
      const athleteDisplayName =
        typeof m.athlete_display_name === "string" && m.athlete_display_name.trim()
          ? m.athlete_display_name.trim().slice(0, 120)
          : null
      const raceParticipantName =
        typeof m.race_participant_name === "string" && m.race_participant_name.trim()
          ? m.race_participant_name.trim().slice(0, 120)
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
        paymentIntentId: paymentIntentIdFromSession(s),
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
        athleteDisplayName,
        manualCreditName,
        raceParticipantName,
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

/** Strip ` · …` suffix from directory-style labels (e.g. "Liam Hickey · …" → "Liam Hickey"). */
export function shortDirectoryDisplayName(label: string | null | undefined): string | null {
  const t = label?.trim()
  if (!t) return null
  const idx = t.indexOf(" · ")
  return idx > 0 ? t.slice(0, idx).trim() : t
}

export type ResolvePublicRunnerOptions = {
  /** Admin/ops CSV: allow donor name when donor hid public list (default: false — avoids leaking payer name on /spartan). */
  anonymousDonorFallback?: boolean
}

/**
 * Runner column: prefer Stripe `race_participant_name`; if missing (legacy sessions), infer credited
 * athlete, then donor only when public-safe (see `anonymousDonorFallback`).
 */
export function resolvePublicRunnerDisplay(
  r: Pick<
    SpartanFayettevilleDonation,
    | "raceParticipant"
    | "raceParticipantName"
    | "athleteDisplayName"
    | "manualCreditName"
    | "donorName"
    | "donorListPublic"
  >,
  options?: ResolvePublicRunnerOptions,
): string | null {
  if (!r.raceParticipant) return null
  const meta = r.raceParticipantName?.trim()
  if (meta) return meta.slice(0, 120)
  const fromAthlete = shortDirectoryDisplayName(r.athleteDisplayName) || r.manualCreditName?.trim()
  if (fromAthlete) return fromAthlete.slice(0, 120)
  const allowDonor = options?.anonymousDonorFallback === true || r.donorListPublic
  if (allowDonor) {
    const donor = r.donorName?.trim()
    if (donor) return donor.slice(0, 120)
  }
  return null
}

/** Readable label from NCU-LASTNAME-YY when we have no directory name (legacy / bookmark-only checkout). */
export function fallbackAthleteLabelFromCode(code: string): string | null {
  const m = /^NCU-([A-Za-z]+)-(\d{2})$/i.exec(code.trim())
  if (!m) return null
  const last = m[1]
  const yy = m[2]
  const pretty = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()
  return `${pretty} · '${yy}`
}

/** Public table: prefer directory/manual name over raw fundraising code. */
export function publicAthleteCreditLabel(
  d: Pick<SpartanFayettevilleDonation, "athleteDisplayName" | "manualCreditName" | "athleteCode" | "attribution">,
): string | null {
  if (d.attribution === "general_nc_united" && !d.athleteCode && !d.manualCreditName) return null
  const direct = d.athleteDisplayName?.trim() || d.manualCreditName?.trim()
  if (direct) return direct
  const code = d.athleteCode?.trim()
  if (!code) return null
  return fallbackAthleteLabelFromCode(code) ?? code
}

function lookupFundraisingDirectoryName(code: string, codeToFullName: Map<string, string>): string | undefined {
  const c = code.trim()
  if (!c) return undefined
  return codeToFullName.get(c) ?? codeToFullName.get(c.toUpperCase())
}

/**
 * Public supporter tables: prefer RecruitNC directory full name (from fundraising code) over
 * Stripe metadata abbreviations like "Hickey '29" or code-only fallbacks.
 */
export function resolvePublicAthleteCreditLabel(
  d: Pick<SpartanFayettevilleDonation, "athleteDisplayName" | "manualCreditName" | "athleteCode" | "attribution">,
  codeToFullName: Map<string, string>,
): string | null {
  if (d.attribution === "general_nc_united" && !d.athleteCode?.trim() && !d.manualCreditName?.trim()) {
    return null
  }

  if (d.attribution === "manual_name") {
    const manual = d.manualCreditName?.trim()
    return manual || null
  }

  const code = d.athleteCode?.trim()
  if (code) {
    const fromDir = lookupFundraisingDirectoryName(code, codeToFullName)
    if (fromDir) return fromDir
  }

  const stripe = d.athleteDisplayName?.trim()
  if (stripe) return stripe

  const manual = d.manualCreditName?.trim()
  if (manual) return manual

  if (!code) return null
  return fallbackAthleteLabelFromCode(code) ?? code
}

export function resolveFundraisingAthleteRowName(
  athleteCode: string,
  codeToFullName: Map<string, string>,
): string {
  const fromDir = lookupFundraisingDirectoryName(athleteCode, codeToFullName)
  if (fromDir) return fromDir
  return fallbackAthleteLabelFromCode(athleteCode) ?? athleteCode
}
