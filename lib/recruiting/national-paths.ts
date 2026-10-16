/* Kept apart from brand.ts so the middleware imports nothing else. */

/**
 * The recruiting product's pages, served on recruitwrestlers.com (Matt, 15 October 2026: "you need
 * all pages part of new URL not nc united"). Anything else asked for there - NC United's home, Blue,
 * store, giving, clubs, calendar, news - is NC United's and goes to its own address.
 */
export const NATIONAL_PATH_PREFIXES = [
  "/recruitwrestlers",
  "/coach-home",
  "/my-recruits",
  "/my-recruiting",
  "/command-center",
  "/prospects",
  "/athletes",
  "/view-profile",
  "/inbox",
  "/public-rankings",
  "/compare",
  "/perfect-recruit",
  "/recruiting",
  "/colleges",
  "/schools",
  "/create-profile",
  "/edit-profile",
  "/submit-profile",
  "/submit-commitment",
  "/sample-scouting-report",
  "/profile",
  "/auth",
  "/privacy",
  "/unsubscribe",
  "/api",
  "/dev",
] as const

export function isNationalPath(pathname: string): boolean {
  return NATIONAL_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

