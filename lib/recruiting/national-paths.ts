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
  "/membership",
  "/prospects",
  "/athletes",
  "/college-commitments",
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
  "/terms",
  "/unsubscribe",
  "/api",
  "/dev",
  // One admin, here (Matt, 22 Oct 2026). Community tools in it (Blue, store, TOC) still work; their
  // public pages are NC United's and open on its address.
  "/admin",
  // RecruitWrestlers articles, e.g. the Super 32 South Carolina recap (app/recaps).
  "/recaps",
  // College coaches' Reports folder: every live state's tournament reports (Matt, 26 Oct 2026).
  "/coach-reports",
  // The coach product's own page: My Recruits, free for college coaches (Matt, 26 Oct 2026).
  "/for-coaches",
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
  // next.recruitwrestlers.com: the new Vercel project's test address before www moves to it
  // (docs/RECRUITWRESTLERS-VERCEL-SPLIT.md). Same brand, same pre-launch gate, never indexed.
  if (h === "recruitwrestlers.com" || h === "www.recruitwrestlers.com" || h === "next.recruitwrestlers.com") return "national"
  return null
}

/**
 * RecruitWrestlers launched (Matt, 26 Oct 2026: "lift gate"). Only the staff preview tools stay
 * behind the gate: /dev renders the site as a named coach or family would see it.
 */
export function isStaffOnlyAfterLaunch(pathname: string): boolean {
  return pathname === "/dev" || pathname.startsWith("/dev/")
}

/** Paths a visitor must reach to sign in, or that carry no athlete data, while the gate is closed. */
export function isOpenWhileStaged(pathname: string): boolean {
  return (
    // The RecruitWrestlers home page is public (Matt, 20 Oct 2026): it carries live counts and no
    // athlete data. Every page behind it stays staff-only until launch.
    pathname === "/" ||
    pathname === "/robots.txt" ||
    // The privacy policy is public: the home page links to it, the Chrome Web Store listing needs it
    // (Matt, 22 Oct 2026), and it carries no athlete data.
    pathname === "/privacy" ||
    pathname === "/recruitwrestlers/privacy" ||
    pathname === "/terms" ||
    pathname === "/recruitwrestlers/terms" ||
    pathname === "/guild-recruiting/coming-soon" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    // Guild Ventures' Stripe webhook: Stripe has no session; the route verifies its signature.
    pathname === "/api/webhooks/stripe-guild" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/guild/") ||
    (pathname.startsWith("/recruitwrestlers/") && /\.(png|jpe?g|svg|webp)$/.test(pathname))
  )
}
