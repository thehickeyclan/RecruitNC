/**
 * Donor-facing copy aligned with nonprofit treatment of designated / preferred gifts:
 * contribution to NC United, organizational discretion, donor preference — not personal gifts to athletes.
 *
 * CPA should review periodically; wording may be adjusted after legal counsel.
 */

/**
 * Neutral tax line for NC United fundraising checkout — same for donor-preference athlete paths and the training fund.
 * CPA may adjust wording; avoid implying certainty of deductibility on either path (both are gifts to NC United via Stripe checkout).
 */
export const NC_UNITED_CONTRIBUTIONS_TAX_DISCLAIMER =
  "Contributions are made to NC United Wrestling. Whether your gift is deductible depends on IRS rules and your tax advisor."

/** Paragraph for athlete “How your support helps” blocks (checkout live — keep concise; CPA may refine). */
export function athletePageSupportHelpParagraph(displayName: string, athleteFirstName: string): string {
  const who = athleteFirstName.trim() || displayName.trim() || "this athlete"
  return `Your gift is made to NC United Wrestling (501(c)(3)), not as a personal payment to ${who}. When you complete checkout, you may express donor preference toward ${who}'s training and competition costs; NC United applies gifts under exempt purpose and its policies.`
}

/** Brief receipt / checkout note paired with athletePageSupportHelpParagraph — avoids a long checklist before “Donate”. */
export function athletePageCheckoutAcknowledgementNote(): string {
  return "You'll receive email acknowledgment from NC United Wrestling after you give (check spam). NC United absorbs card-processing fees on hub fundraising checkouts where campaign rules allow — your contribution stays governed as a charitable gift to NC United. Ask your tax advisor if you have questions about deductions."
}
