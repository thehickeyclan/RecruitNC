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
  /**
   * NC United team tee (Stripe metadata `tee_sz` / `tee_100_eligible`) when checkout required size+ship
   * ($100+ single gift, or race path). Omitted in API until re-sync from Stripe; not stored in Supabase.
   */
  tee100Eligible: boolean
  teeShirtSize: string | null
  teeShipLine1: string | null
  teeShipLine2: string | null
  teeShipCity: string | null
  teeShipState: string | null
  teeShipPostal: string | null
  teeShipCountry: string | null
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

      const tee100Eligible = m.tee_100_eligible === "yes"
      const teeShirtSize =
        typeof m.tee_sz === "string" && m.tee_sz.trim() ? m.tee_sz.trim().toUpperCase().slice(0, 8) : null
      const teeShipLine1 = typeof m.ship_1 === "string" && m.ship_1.trim() ? m.ship_1.trim().slice(0, 120) : null
      const teeShipLine2 = typeof m.ship_2 === "string" && m.ship_2.trim() ? m.ship_2.trim().slice(0, 120) : null
      const teeShipCity = typeof m.ship_city === "string" && m.ship_city.trim() ? m.ship_city.trim().slice(0, 80) : null
      const teeShipState = typeof m.ship_st === "string" && m.ship_st.trim() ? m.ship_st.trim().slice(0, 32) : null
      const teeShipPostal = typeof m.ship_zip === "string" && m.ship_zip.trim() ? m.ship_zip.trim().slice(0, 20) : null
      const teeShipCountry =
        typeof m.ship_ctry === "string" && m.ship_ctry.trim() ? m.ship_ctry.trim().slice(0, 2).toUpperCase() : null

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
        tee100Eligible,
        teeShirtSize,
        teeShipLine1,
        teeShipLine2,
        teeShipCity,
        teeShipState,
        teeShipPostal,
        teeShipCountry,
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
    /** Merge on lowercase so NCU-hickey-29 and NCU-HICKEY-29 add together (matches profile lookup by lowercased code). */
    const k = r.athleteCode.trim().toLowerCase()
    const cur = map.get(k) ?? {
      athleteCode: r.athleteCode.trim(),
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

/**
 * Best display label from Stripe metadata per NCU code (keys lowercased), when the RecruitNC directory
 * misses that code (roster/code drift). Picks the hint from the **newest** paid session that has
 * `athlete_display_name`, so leaderboards keep "Jack Aponte" even if directory cache lags.
 */
export function buildStripeAthleteDisplayHintsByCode(rows: SpartanFayettevilleDonation[]): Map<string, string> {
  const best = new Map<string, { unix: number; text: string }>()
  for (const r of rows) {
    if (!r.athleteCode?.trim()) continue
    const k = r.athleteCode.trim().toLowerCase()
    const raw =
      shortDirectoryDisplayName(r.athleteDisplayName)?.trim() || r.athleteDisplayName?.trim() || ""
    if (!raw) continue
    const text = raw.slice(0, 120)
    const prev = best.get(k)
    if (!prev || r.createdUnix >= prev.unix) {
      best.set(k, { unix: r.createdUnix, text })
    }
  }
  const out = new Map<string, string>()
  for (const [k, v] of best) out.set(k, v.text)
  return out
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

/**
 * When the directory has no full name for this code, derive a short label.
 * `NCU-SMITH-29` → "Smith · '29". Collision bases like `NCU-GOREAI-27` (long middle segment) are
 * not a single surname — if we title-case "GOREAI" we get the bogus "Goreai · '27", so for long
 * segments we show the code string instead.
 */
export function fallbackAthleteLabelFromCode(code: string): string | null {
  const t = code.trim()
  const m = /^NCU-([A-Za-z]+)-(\d{2})$/i.exec(t)
  if (!m) return null
  const last = m[1]
  const yy = m[2]
  if (last.length > 5) {
    return t
  }
  const pretty = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase()
  return `${pretty} · '${yy}`
}

/** Athlete column for gifts with no wrestler credit — pooled NC United / community programs. */
export const SPARTAN_NC_UNITED_FUND_CREDIT_LABEL = "NC United fund"

/** Public table: prefer directory/manual name over raw fundraising code. */
export function publicAthleteCreditLabel(
  d: Pick<SpartanFayettevilleDonation, "athleteDisplayName" | "manualCreditName" | "athleteCode" | "attribution">,
): string | null {
  if (
    d.attribution === "general_nc_united" &&
    !d.athleteCode?.trim() &&
    !d.manualCreditName?.trim()
  ) {
    return SPARTAN_NC_UNITED_FUND_CREDIT_LABEL
  }
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
 * `stripeDisplayHints` (per lowered NCU code, from any checkout in the window) covers rows whose
 * session metadata is empty after credit corrections or legacy sessions — same logic as leaderboard.
 */
export function resolvePublicAthleteCreditLabel(
  d: Pick<SpartanFayettevilleDonation, "athleteDisplayName" | "manualCreditName" | "athleteCode" | "attribution">,
  codeToFullName: Map<string, string>,
  stripeDisplayHints?: Map<string, string>,
): string | null {
  if (d.attribution === "general_nc_united" && !d.athleteCode?.trim() && !d.manualCreditName?.trim()) {
    return SPARTAN_NC_UNITED_FUND_CREDIT_LABEL
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

  if (code) {
    const fromHint = stripeDisplayHints?.get(code.toLowerCase())?.trim()
    if (fromHint) return fromHint
  }

  const manual = d.manualCreditName?.trim()
  if (manual) return manual

  if (!code) return null
  return fallbackAthleteLabelFromCode(code) ?? code
}

export function resolveFundraisingAthleteRowName(
  athleteCode: string,
  codeToFullName: Map<string, string>,
  stripeDisplayHints?: Map<string, string>,
): string {
  const fromDir = lookupFundraisingDirectoryName(athleteCode, codeToFullName)
  if (fromDir) return fromDir
  const k = athleteCode.trim().toLowerCase()
  const fromStripe = stripeDisplayHints?.get(k)?.trim()
  if (fromStripe) return fromStripe
  return fallbackAthleteLabelFromCode(athleteCode) ?? athleteCode
}
