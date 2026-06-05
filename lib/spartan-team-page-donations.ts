function isEnvEnabled(v: string | undefined): boolean {
  if (!v) return false
  const t = v.trim().toLowerCase()
  return t === "1" || t === "true" || t === "yes" || t === "on"
}

/**
 * Team NC `/spartan` checkout: NC United Training Fund only (no wrestler-named gifts, no race path).
 * Set `RECRUITNC_SPARTAN_ATHLETE_DONATIONS_ENABLED=1` and `NEXT_PUBLIC_SPARTAN_ATHLETE_DONATIONS_ENABLED=1` to restore.
 */
export function isSpartanTeamPageAthleteDonationsDisabled(): boolean {
  const enabled =
    isEnvEnabled(process.env.RECRUITNC_SPARTAN_ATHLETE_DONATIONS_ENABLED) ||
    isEnvEnabled(process.env.NEXT_PUBLIC_SPARTAN_ATHLETE_DONATIONS_ENABLED)
  return !enabled
}

export function isSpartanTeamPageCheckout(body: { fundraisingHub?: boolean }): boolean {
  return body.fundraisingHub !== true
}

export const SPARTAN_TRAINING_FUND_ONLY_MESSAGE =
  "Wrestler-named gifts and Spartan race checkout are closed on the Team NC page. Give to the NC United Training Fund only."
