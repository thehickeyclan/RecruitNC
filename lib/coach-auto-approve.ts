/**
 * Whether a college-coach signup approves itself.
 *
 * `verified_coach` unlocks athlete GPA, test scores, phone numbers and email addresses — data
 * belonging to minors — so the rule that grants it is deliberately small, readable and tested.
 *
 * A `.edu` address proves someone is affiliated with a US institution. It does not prove they
 * coach: students and, at many schools, alumni hold one for life. This trades that risk for
 * removing a manual step from the coaches we actually want. Revoking is a single field, so audit
 * the approved list rather than assuming the domain did the work.
 */

/** Domain of an email address, lowercased. Null when the address is unusable. */
export function emailDomain(email: string | null | undefined): string | null {
  const value = String(email ?? "").trim().toLowerCase()
  const at = value.lastIndexOf("@")
  if (at <= 0 || at === value.length - 1) return null
  const domain = value.slice(at + 1)
  // No spaces, no second @, and at least one dot with labels either side.
  if (!/^[a-z0-9.-]+$/.test(domain)) return null
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return null
  return domain
}

/** True for addresses whose domain is, or sits under, a `.edu` top-level domain. */
export function isEduEmail(email: string | null | undefined): boolean {
  const domain = emailDomain(email)
  if (!domain) return false
  // `.edu` must be the last label: `ncsu.edu` and `mail.ncsu.edu` qualify, `ncsu.edu.mx` does not.
  return /\.edu$/.test(domain)
}

/** The roles that mean "college coach", in every spelling the codebase has used. */
export function isCollegeCoachRole(role: string | null | undefined): boolean {
  const normalized = String(role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")
  return normalized === "college_coach"
}

/**
 * Auto-approve a college coach signing up from a `.edu` address.
 *
 * Both halves are required: a `.edu` address on any other role grants nothing, and a college
 * coach on a personal address still waits for a human.
 */
export function shouldAutoApproveCoach(input: {
  role: string | null | undefined
  email: string | null | undefined
}): boolean {
  return isCollegeCoachRole(input.role) && isEduEmail(input.email)
}
