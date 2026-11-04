/**
 * Who may open the Business admin, and exactly which pages a grant opens.
 *
 * Rhett runs RecruitWrestlers sales and social (Matt, 4 November 2026) and needs the numbers to
 * run that business: accounts, claims, coach activity, state by state, men's and women's, across
 * NC United and RecruitWrestlers with a filter for either. He must not get `is_admin`, which
 * opens all ~250 admin pages - contacts, Blue, fundraising, orders, the athlete editors - and he
 * must never see a kid's or a parent's details (Matt, same day).
 *
 * So the grant lives in Supabase Auth `app_metadata`, which only the service role can write, the
 * same mechanism as the TOC field flag and the ranking-board grants:
 *
 *   app_metadata.business_access = true
 *
 * and it opens a NAMED LIST of pages, nothing else. Closed unless listed is the direction that
 * stays safe: a new admin page added next month is shut to a business account until somebody puts
 * it in `BUSINESS_PAGES` on purpose. The reverse - admin minus a blocklist - leaks by default.
 *
 * Full admins are unaffected and still open everything.
 */

export const BUSINESS_GRANT = "business_access"

/**
 * The pages a business grant opens. Each one reports numbers; none of them renders a family's
 * name, phone, email or address, and none reads the coach CRM's own columns on
 * `college_coach_stars`.
 *
 * Adding a path here is a decision about what a non-admin may see, so open the page and look at
 * what it actually renders first. `/admin/command-center-activation` was on this list until that
 * check: it prints one row per family headed by `full_name || email`, so it came off and stays
 * admin-only. Wrestlers' names do appear - on the rankings board and on college interest, both of
 * which Matt named on 4 November 2026 - because a wrestler's name and results are the product.
 * A parent's details are not.
 */
export const BUSINESS_PAGES: readonly string[] = [
  "/admin/business",
  "/admin/sites",
  "/admin/funnel",
  "/admin/coach-usage",
  "/admin/college-interest",
  "/admin/card-analytics",
  "/admin/rankings/board",
]

/** Whether a grant opens this page: an exact match, or a page beneath one of the listed ones. */
export function businessCanOpen(pathname: string): boolean {
  const path = String(pathname ?? "").replace(/\/+$/, "") || "/"
  return BUSINESS_PAGES.some((p) => path === p || path.startsWith(p + "/"))
}

/** Whether these `app_metadata` claims carry the grant. Anything but `true` is no grant. */
export function hasBusinessGrant(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== "object") return false
  return (appMetadata as Record<string, unknown>)[BUSINESS_GRANT] === true
}

export type BusinessDecision = { allow: true; isAdmin: boolean } | { allow: false; reason: string }

/**
 * The whole access decision, with nothing to mock: given whether the viewer is a full admin, what
 * their `app_metadata` says, and the page they asked for, may they see it?
 *
 * Pulled out of requireBusinessViewer so the rule itself is tested rather than trusted. The rule
 * is: admins see everything, a grant sees a page on the list, and nobody else sees anything.
 */
export function businessDecision(isAdmin: boolean, appMetadata: unknown, page: string): BusinessDecision {
  if (isAdmin) return { allow: true, isAdmin: true }
  if (!hasBusinessGrant(appMetadata)) return { allow: false, reason: "Business access required" }
  if (!businessCanOpen(page)) return { allow: false, reason: "That page is not part of the Business admin" }
  return { allow: true, isAdmin: false }
}
