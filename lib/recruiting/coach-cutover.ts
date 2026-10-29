/* Kept free of server imports: the middleware reads it. */
import { isNationalPath } from "@/lib/recruiting/national-paths"

/**
 * College coaches work on RecruitWrestlers.com (Matt, 29 Oct 2026): every live state, the South
 * Carolina reports, the RecruitWrestlers look. Most still sign in at NC United, and that keeps
 * working - a coach who opens the recruiting portal there is handed across, signed in, to the
 * same page on RecruitWrestlers (app/auth/rw-handoff). Set false to keep coaches on NC United.
 */
export const COACH_RW_CUTOVER = true

export const RW_ORIGIN = "https://www.recruitwrestlers.com"

/** NC United's own address; development and previews never hand a coach to production. */
export const NCU_PRODUCTION_HOSTS = new Set(["app.ncwrestlingunited.com"])

/** The pages a coach is handed across from: the front page and the recruiting portal's pages. */
export function isCoachCutoverPath(pathname: string): boolean {
  if (pathname === "/") return true
  if (/^\/(api|auth|admin|dev)(\/|$)/.test(pathname)) return false
  return isNationalPath(pathname)
}

/** A same-site path to continue to, never another site. */
export function safeNextPath(raw: string | null | undefined, fallback = "/my-recruits"): string {
  const next = String(raw ?? "")
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/auth/") ? next : fallback
}
