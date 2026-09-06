/**
 * Who the scouting report is released to, before it goes on sale.
 *
 * The feature is finished but not launched. Until it is, access is an explicit allowlist —
 * not "college coaches", not "admins", just the named accounts testing it. That is narrower
 * than the role rules on purpose: this is the one page that puts a minor's cell number,
 * email and GPA in a single printable file, and it should not be quietly reachable by 41
 * coaches while it is still being decided how it is sold.
 *
 * Set RECRUITNC_SCOUTING_REPORT_ALLOWLIST to a comma-separated list of account emails.
 * Leaving it empty opens the feature to the normal role rules — that is the launch switch,
 * so it is deliberately the *absence* of a value rather than a flag somebody has to remember
 * to flip.
 */

const ALLOWLIST_ENV = "RECRUITNC_SCOUTING_REPORT_ALLOWLIST"

/** Emails permitted while the feature is pre-launch. Empty means "no allowlist in force". */
export function scoutingReportAllowlist(): string[] {
  return (process.env[ALLOWLIST_ENV] ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

/** True once the allowlist is cleared and the normal role rules apply. */
export function isScoutingReportLaunched(): boolean {
  return scoutingReportAllowlist().length === 0
}

/**
 * May this account reach the scouting report at all?
 *
 * While an allowlist is in force it is the *only* rule — an admin who is not on it is
 * refused, so a pre-launch test is genuinely limited to the people running it.
 */
export function canAccessScoutingReport(params: {
  email: string | null | undefined
  isCollegeCoach: boolean
  isAdmin: boolean
}): boolean {
  const allowlist = scoutingReportAllowlist()
  if (allowlist.length > 0) {
    const email = String(params.email ?? "").trim().toLowerCase()
    return email.length > 0 && allowlist.includes(email)
  }
  return params.isCollegeCoach || params.isAdmin
}
