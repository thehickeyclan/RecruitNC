/**
 * Donor-facing copy aligned with nonprofit treatment of designated / preferred gifts:
 * contribution to NC United, organizational discretion, donor preference — not personal gifts to athletes.
 *
 * CPA should review periodically; wording may be adjusted after legal counsel.
 */

/** Paragraph for athlete “How your support helps” blocks. */
export function athletePageSupportHelpParagraph(displayName: string, athleteFirstName: string): string {
  const who = athleteFirstName.trim() || displayName.trim() || "this athlete"
  return `Your donation is made to NC United Wrestling, not to ${who} personally. NC United may designate support toward wrestling training and competition costs for wrestlers donors choose—including ${who} when you complete checkout—as allowed by donor-preference guidelines, NC United policies, and applicable law. NC United retains charitable discretion over the use of all contributions. Deductions, if any, are subject to IRS rules and your advisor.`
}
