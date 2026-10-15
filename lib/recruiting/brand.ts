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
  /**
   * States whose wrestlers are in the product, in the order they opened. Each state is its own
   * brand to families - Recruit + the state code (Matt, 15 October 2026). `live: false` is a state
   * being checked before it is announced: admins can open it, coaches cannot, and the coverage
   * line does not name it. Setting it to true is the launch.
   */
  states: [
    { code: "NC", name: "North Carolina", live: true },
    { code: "SC", name: "South Carolina", live: false },
  ],
} as const

export type RecruitingState = (typeof RECRUITING_BRAND.states)[number]

/** States a viewer may open: the live ones, and the ones still being checked for an admin. */
export function visibleStates(isAdmin: boolean): RecruitingState[] {
  return RECRUITING_BRAND.states.filter((s) => s.live || isAdmin)
}

export function isVisibleState(code: string | null | undefined, isAdmin: boolean): boolean {
  return visibleStates(isAdmin).some((s) => s.code === String(code ?? "").toUpperCase())
}

/** "North Carolina", "North Carolina and South Carolina", "North Carolina, South Carolina, and Virginia". */
export function recruitingCoverage(): string {
  const names = RECRUITING_BRAND.states.filter((s) => s.live).map((s) => s.name)
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

/**
 * Programs whose coaches also use the NC United site, by `schools.id`.
 *
 * The coach portal carries nothing of NC United - except for a program that works with NC United
 * as well as recruiting from it. NC United practices in UNC's wrestling room, so UNC's staff need
 * the NC United calendar and site (Matt, 13 October 2026). Their home is still Coach Home; they
 * get a way across that no other coach is shown.
 */
export const COMMUNITY_PARTNER_SCHOOL_IDS: readonly string[] = [
  "8a62c142-afec-457f-b908-24fa0df0e273", // UNC Chapel Hill
]

/** The NC United pages a partner program's coaches are given links to. */
export const COMMUNITY_PARTNER_LINKS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/?community=1", label: "NC United site" },
] as const

export function hasCommunityAccess(profile: { role?: string | null; is_admin?: boolean | null; school_id?: string | null } | null | undefined): boolean {
  return usesRecruitingShell(profile) && COMMUNITY_PARTNER_SCHOOL_IDS.includes(String(profile?.school_id ?? ""))
}

export function usesRecruitingShell(profile: { role?: string | null; is_admin?: boolean | null } | null | undefined): boolean {
  // classifyViewer, not a literal compare: the role is stored as both "college_coach" and "college-coach".
  return classifyViewer(profile).isCollegeCoach && profile?.is_admin !== true
}
