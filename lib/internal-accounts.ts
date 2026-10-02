/**
 * Accounts that are ours, not users — and must never read as college interest.
 *
 * Apple's reviewers need a working college-coach login to approve each app release, so those
 * accounts carry `role: college_coach` and behave exactly like a recruiter. Their browsing was
 * landing on families' profiles as "a college program viewed your wrestler" — four wrestlers
 * were showing a view from a reviewer or from our own test login.
 *
 * Narrow rules on purpose, each one a domain nobody recruiting from a college could hold:
 *
 * - **ncwrestlingunited.com** is our own staff domain.
 * - **example.com / example.org** are reserved for documentation (RFC 2606); real mail never
 *   comes from them.
 * - The App Store review logins, by exact address, because they sit on a public mail provider
 *   and no pattern can reach them without also catching somebody real.
 *
 * Deliberately not a guess at words like "test" or "review" in a name: Review is a surname,
 * and silently dropping a real coach's view is worse than showing one of ours.
 */

const INTERNAL_DOMAINS = ["ncwrestlingunited.com", "example.com", "example.org"]

/** App Store review logins, held for as long as Apple needs them. */
const INTERNAL_ADDRESSES = ["thehickeyclan+applereview@gmail.com"]

export function isInternalAccount(email: string | null | undefined): boolean {
  const address = String(email ?? "").trim().toLowerCase()
  if (!address) return false
  if (INTERNAL_ADDRESSES.includes(address)) return true
  const domain = address.split("@")[1] ?? ""
  return INTERNAL_DOMAINS.includes(domain)
}
