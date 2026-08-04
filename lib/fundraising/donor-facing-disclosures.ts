/**
 * Donor-facing disclosures — wording reviewed with NC United accountants.
 *
 * Receipts/acknowledgements are prepared for IRC charitable-gift documentation.
 * Website copy should not imply every donor may deduct—but should encourage donors
 * to confirm how gifts fit their own tax situation with an advisor (no over-correction away from lawful treatment).
 */

/**
 * Default tax line across checkout, hub, athlete pages — confident on receipt correctness; donor-specific on deductions.
 */
export const NC_UNITED_CONTRIBUTIONS_TAX_DISCLAIMER =
  "NC United acknowledgements are prepared consistently with IRC rules for charitable gifts. Whether your gift is deductible on your tax return depends on your situation—consult your tax advisor."

/**
 * Brief reassurance below Training Fund-focused copy (CPA: governance / charter path in good order for this pool).
 */
export const NC_UNITED_TRAINING_FUND_GOVERNANCE_DISCLAIMER =
  "General gifts are made to NC United Wrestling under our nonprofit governance. NC United retains discretion and control over their charitable use; they are not earmarked for or paid directly to an individual athlete."

/** Paragraph for athlete “How your support helps” blocks (checkout live — keep concise). */
export function athletePageSupportHelpParagraph(displayName: string, athleteFirstName: string): string {
  const who = athleteFirstName.trim() || displayName.trim() || "this athlete"
  return `Your contribution is made to NC United Wrestling for the NC United Training Fund, noted in ${who}'s name, and is administered toward eligible training and competition costs under NC United policy—not cash or property paid directly to ${who}.`
}

/** Brief receipt note paired with athletePageSupportHelpParagraph — avoids a long checklist before Donate. */
export function athletePageCheckoutAcknowledgementNote(): string {
  return "After checkout, NC United emails your charitable gift acknowledgement (consistent with IRC documentation rules)—check spam. NC United absorbs card-processing fees on hub fundraising checkouts where campaign rules allow. Ask your advisor how deductions apply to you."
}
