/**
 * What a person agrees to when they make an account, and the record we keep of it (Matt's launch
 * review, 30 Oct 2026: "make sure you capture everything we need from a privacy, consent, etc. on
 * sign up"). Shared by the sign-up form, the Google finish-up page and the three sign-up routes, so
 * the rule is checked once in the browser and again on the server.
 *
 * - Everyone accepts the Terms of Service and the Privacy Policy, by version.
 * - An athlete says how old they are. Under 13 cannot make their own account (a parent does);
 *   13 to 17 needs a parent or guardian's agreement.
 * - Email updates are a separate, optional yes.
 */
export const TERMS_VERSION = "2026-10-30"
export const PRIVACY_VERSION = "2026-10-30"

export type AgeBand = "18+" | "13-17" | "under-13"

export type ConsentInput = {
  termsAccepted?: unknown
  ageBand?: unknown
  guardianConsent?: unknown
  marketingOptIn?: unknown
}

export type ConsentRecord = {
  terms_version: string
  privacy_version: string
  accepted_at: string
  /** Athletes only. */
  age_band: AgeBand | null
  /** Athletes 13 to 17: a parent or guardian agreed. */
  guardian_consent: boolean
  marketing_opt_in: boolean
  source: "email" | "google" | "coach"
}

const AGE_BANDS: AgeBand[] = ["18+", "13-17", "under-13"]

/** The consent record, or the sentence that says what is missing. */
export function checkConsent(
  input: ConsentInput | null | undefined,
  role: string | null | undefined,
  source: ConsentRecord["source"],
  now: Date = new Date(),
): { ok: true; record: ConsentRecord } | { ok: false; error: string } {
  if (input?.termsAccepted !== true) return { ok: false, error: "Agree to the Terms of Service and Privacy Policy to continue." }
  const athlete = String(role ?? "").toLowerCase() === "athlete"
  const ageBand = AGE_BANDS.includes(input?.ageBand as AgeBand) ? (input!.ageBand as AgeBand) : null
  if (athlete) {
    if (!ageBand) return { ok: false, error: "Tell us how old you are." }
    if (ageBand === "under-13") return { ok: false, error: "Wrestlers under 13 need a parent to make the account. Ask a parent to sign up as a Parent." }
    if (ageBand === "13-17" && input?.guardianConsent !== true) {
      return { ok: false, error: "A parent or guardian needs to agree to the Terms and Privacy Policy for you." }
    }
  }
  return {
    ok: true,
    record: {
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      accepted_at: now.toISOString(),
      age_band: athlete ? ageBand : null,
      guardian_consent: athlete && ageBand === "13-17" ? input?.guardianConsent === true : false,
      marketing_opt_in: input?.marketingOptIn === true,
      source,
    },
  }
}

/** Who sees the cell number, said where it is asked for. */
export function cellNotice(role: string | null | undefined): string {
  const r = String(role ?? "").toLowerCase()
  if (r === "athlete") return "Shown only to verified college coaches and your family, never publicly. We text only about your account and recruiting activity; reply STOP to stop."
  if (r === "parent") return "Never public. Used for your account and your wrestler's recruiting notices; reply STOP to stop texts."
  return "Never public. Our staff use it to confirm you coach where you say."
}
