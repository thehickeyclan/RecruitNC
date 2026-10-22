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
  "/interested",
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



/**
 * Addresses that serve the recruiting product under another brand before public launch.
 *
 * recruit.wrestlingguild.com is Guild Recruiting (Matt approved Phase 1, 16 Oct 2026); it stays
 * behind a server-enforced gate (lib/staging-gate.ts) until he approves launch. recruitwrestlers.com,
 * the earlier national address, is held behind the same gate: it becomes a forward to Guild
 * Recruiting at launch.
 */
export const GUILD_RECRUITING_HOST = "recruit.wrestlingguild.com"

export type StagedBrand = "guild" | "national"

export function stagedBrandForHost(host: string | null | undefined): StagedBrand | null {
  const h = String(host ?? "").toLowerCase().split(":")[0]
  if (h === GUILD_RECRUITING_HOST) return "guild"
  if (h === "recruitwrestlers.com" || h === "www.recruitwrestlers.com") return "national"
  return null
}

/** Paths a visitor must reach to sign in, or that carry no athlete data, while the gate is closed. */
export function isOpenWhileStaged(pathname: string): boolean {
  return (
    // The RecruitWrestlers home page is public (Matt, 20 Oct 2026): it carries live counts and no
    // athlete data. Every page behind it stays staff-only until launch.
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/guild-recruiting/coming-soon" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/guild/") ||
    (pathname.startsWith("/recruitwrestlers/") && /\.(png|jpe?g|svg|webp)$/.test(pathname))
  )
}
