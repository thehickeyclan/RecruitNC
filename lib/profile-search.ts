import { currentClassYears } from "@/lib/class-years"

/**
 * Whether a wrestler's profile may appear in search engines (Matt, 30 Oct 2026: profiles in Google,
 * "make sure we are capturing consent and respecting privacy laws").
 *
 * FloWrestling and MatMetrics already publish every high-school wrestler's name and results as
 * searchable pages, so our profile adds no new exposure of those facts. The guard rails:
 * - High-school classes only (the current classes): nobody in middle school, nobody under 13.
 * - Only what the public already sees is indexable: GPA, phone and email are never on the public page.
 * - Photos stay out of image search and out of search snippets (noimageindex, max-image-preview none).
 * - A family can hide the profile from search engines at any time (custom_attributes.search_hidden),
 *   and anyone can ask us to for a profile nobody has claimed (the Privacy Policy says how).
 */
export const SEARCH_HIDDEN_KEY = "search_hidden"

export type SearchRobots = {
  index: boolean
  follow: boolean
  nocache?: boolean
  noimageindex?: boolean
  "max-image-preview"?: "none" | "standard" | "large"
  googleBot?: { index: boolean; follow: boolean; noimageindex?: boolean; "max-image-preview"?: "none" | "standard" | "large" }
}

const HIDDEN: SearchRobots = { index: false, follow: false, nocache: true }
const SHOWN: SearchRobots = {
  index: true,
  follow: true,
  noimageindex: true,
  "max-image-preview": "none",
  googleBot: { index: true, follow: true, noimageindex: true, "max-image-preview": "none" },
}

export function profileSearchHidden(customAttributes: unknown): boolean {
  return Boolean(customAttributes && typeof customAttributes === "object" && (customAttributes as Record<string, unknown>)[SEARCH_HIDDEN_KEY] === true)
}

/** The robots rule for one profile. */
export function profileRobots(athlete: { graduationyear?: unknown; custom_attributes?: unknown } | null, now: Date = new Date()): SearchRobots {
  if (!athlete) return HIDDEN
  const year = Number(athlete.graduationyear)
  if (!Number.isFinite(year) || !currentClassYears(now).includes(year)) return HIDDEN
  if (profileSearchHidden(athlete.custom_attributes)) return HIDDEN
  return SHOWN
}
