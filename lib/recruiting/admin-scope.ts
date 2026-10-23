/* Kept free of imports so the middleware, the theme generator and the admin menu can all use it. */

/**
 * Admin tools that belong to NC United's community site, not to RecruitWrestlers (Matt, 23 Oct
 * 2026: "ensure you are not bringing in anything from nc united community site that is not
 * needed"). On recruitwrestlers.com they are hidden from the admin menu and dashboard, and their
 * addresses forward to the same page on app.ncwrestlingunited.com. On NC United's address nothing
 * changes.
 *
 * Blue, the store, TOC, national team, fundraising and giving, Guild credits for NC United
 * athletes, the events calendar, club submissions, mass email to members, the NC United iPhone
 * app's push health, NC United's revenue and its custom emoji.
 */
export const COMMUNITY_ADMIN_PREFIXES = [
  "/admin/blue",
  "/admin/blue-interest",
  "/admin/calendar",
  "/admin/clubs",
  "/admin/customers",
  "/admin/custom-emoji",
  "/admin/expense-requests",
  "/admin/fundraising",
  "/admin/fundraising-ledger",
  "/admin/guild-credit-allocations",
  "/admin/guild-parent-link",
  "/admin/inventory",
  "/admin/messaging",
  "/admin/national-team",
  "/admin/national-team-submissions",
  "/admin/orders",
  "/admin/products",
  "/admin/promo-codes",
  "/admin/push-health",
  "/admin/recover-order",
  "/admin/reimbursements",
  "/admin/revenue",
  "/admin/scholarships",
  "/admin/store",
  "/admin/toc",
  "/admin/weekend-wars",
] as const

export function isCommunityAdminPath(pathname: string): boolean {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, "")
  return COMMUNITY_ADMIN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
}

/** NC United's own admin, linked from the RecruitWrestlers admin for the tools above. */
export const NCU_ADMIN_URL = "https://app.ncwrestlingunited.com/admin"
