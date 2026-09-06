/**
 * Who gets which fields of a scouting report.
 *
 * Two grants, deliberately separated:
 *
 * - **Browsing** is auto-approved on a `.edu` address. That was always the bar for seeing a
 *   phone number on a profile page, and it stays.
 * - **The report** is a portable, complete dossier on a minor — cell, email, GPA, test
 *   scores — in a file that leaves the platform the moment it is saved. A `.edu` address does
 *   not prove someone coaches (students and alumni hold one for life, as
 *   `lib/coach-auto-approve.ts` says plainly), so the full field set requires the human check
 *   against the program's public staff directory.
 *
 * Everyone else who can reach a report gets the intelligence tier: results, significant wins
 * and losses, head-to-head, ranking. That is the part worth reading and the part worth
 * selling; it carries no personal data at all.
 */

export type ScoutingAccessTier =
  /** Results and analysis only. No contact details, no academics. */
  | "intelligence"
  /** Adds cell, email, GPA and test scores. Verified against a staff directory. */
  | "full"

export type ScoutingViewer = {
  isCollegeCoach: boolean
  isAdmin: boolean
  verifiedCoach: boolean
  /** "staff_directory" once a human confirmed the coach; "edu_auto" when the domain did it. */
  verifiedMethod?: string | null
}

/** The verification method that releases a minor's contact and academic detail. */
export const HUMAN_VERIFIED_METHOD = "staff_directory"

/**
 * The field set this viewer may receive.
 *
 * Admins get the full set — they administer the data already. A college coach needs both the
 * verified flag and the human-confirmed method; the `.edu` rule alone is not enough for the
 * portable document.
 */
export function scoutingAccessTier(viewer: ScoutingViewer): ScoutingAccessTier {
  if (viewer.isAdmin) return "full"
  if (!viewer.isCollegeCoach || !viewer.verifiedCoach) return "intelligence"
  return viewer.verifiedMethod === HUMAN_VERIFIED_METHOD ? "full" : "intelligence"
}

/** True when the tier releases personal detail belonging to the athlete. */
export function releasesPersonalData(tier: ScoutingAccessTier): boolean {
  return tier === "full"
}

/**
 * The line printed on the report identifying who pulled it.
 *
 * Watermarking is the cheapest meaningful control on redistribution: it slows no legitimate
 * coach down, and someone whose own name is on the page behaves differently with it.
 */
export function watermarkLine(viewer: {
  name?: string | null
  institution?: string | null
  email?: string | null
}): string {
  const who = [viewer.name, viewer.institution].map((v) => String(v ?? "").trim()).filter(Boolean)
  const label = who.length ? who.join(" · ") : String(viewer.email ?? "").trim() || "Verified coach"
  return `Prepared for ${label}`
}
