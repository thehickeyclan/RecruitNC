import { classifyViewer } from "@/lib/viewer-role"

/**
 * The recruiting product's name and the states it covers, in one place (Matt, 11 October 2026).
 *
 * Recruiting is being separated from the NC United community site: its own header and footer, a
 * name that will change before the second state goes live, and states added one at a time. Pages a
 * coach uses read the name and the coverage from here rather than typing "RecruitNC" or "North
 * Carolina", so the rename is this file and a new state is one more entry in `states`.
 */
export const RECRUITING_BRAND = {
  name: "RecruitNC",
  /** Drawn as two tones in the header: the second part takes the accent colour. */
  wordmark: ["Recruit", "NC"] as const,
  tagline: "College wrestling recruiting, built on verified results.",
  /** Who runs the community side, and who holds the copyright until the company exists. */
  parent: "NC United Wrestling",
  supportEmail: "info@ncwrestlingunited.com",
  /** States whose wrestlers are in the product, in the order they opened. */
  states: [{ code: "NC", name: "North Carolina" }],
} as const

/** "North Carolina", "North Carolina and South Carolina", "North Carolina, South Carolina, and Virginia". */
export function recruitingCoverage(): string {
  const names = RECRUITING_BRAND.states.map((s) => s.name)
  return new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(names)
}

/**
 * Who gets the recruiting interface: a college coach, and not an admin, who works on both sides and
 * keeps the full community bar.
 */
/**
 * An admin can look at the coach interface without a coach login: /coach-home?view=coach turns it
 * on in this browser, ?view=admin (or "Exit coach view" in the account menu) turns it off.
 */
export const COACH_PREVIEW_KEY = "recruiting-shell-preview"

export function usesRecruitingShell(profile: { role?: string | null; is_admin?: boolean | null } | null | undefined): boolean {
  // classifyViewer, not a literal compare: the role is stored as both "college_coach" and "college-coach".
  return classifyViewer(profile).isCollegeCoach && profile?.is_admin !== true
}
