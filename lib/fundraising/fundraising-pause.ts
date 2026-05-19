/**
 * Operational toggles (Vercel env). When unset/false, behavior is normal.
 *
 * - `RECRUITNC_FUNDRAISING_RECEIPTS_PAUSED` — skips 501(c)(3) donor acknowledgment emails
 *   (Stripe webhook auto-ack + admin “send receipt”); does not block Stripe charges or webhook upserts.
 * - `RECRUITNC_FUNDRAISING_ATHLETE_DONATIONS_DISABLED` — hides athlete-page checkout UI and rejects
 *   `/api/spartan/checkout` for hub athlete gift pages (still allows `/fundraising/give`, training fund, scholarships).
 */

function isEnvPauseOn(v: string | undefined): boolean {
  if (!v) return false
  const t = v.trim().toLowerCase()
  return t === "1" || t === "true" || t === "yes" || t === "on"
}

export function isFundraisingReceiptsPaused(): boolean {
  return isEnvPauseOn(process.env.RECRUITNC_FUNDRAISING_RECEIPTS_PAUSED)
}

export function isFundraisingAthletePageDonationsDisabled(): boolean {
  return isEnvPauseOn(process.env.RECRUITNC_FUNDRAISING_ATHLETE_DONATIONS_DISABLED)
}

/** Hub checkout that credits a specific athlete page (`/fundraising/athletes/{slug}`), not training/scholarship hubs. */
export function isAthleteGiftPageHubCheckout(body: {
  fundraisingHub?: boolean
  fundraisingHubReturnSlug?: string
}): boolean {
  if (body.fundraisingHub !== true) return false
  const slug = typeof body.fundraisingHubReturnSlug === "string" ? body.fundraisingHubReturnSlug.trim().toLowerCase() : ""
  if (!slug) return false
  if (slug === "training-fund") return false
  if (slug.startsWith("scholarships/")) return false
  return true
}
