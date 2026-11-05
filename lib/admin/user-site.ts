/**
 * Which site a user belongs to on the users dashboard (Matt, 4 Nov 2026: "you should flag which
 * site they logged in from").
 *
 * Two facts, kept apart because they answer different questions:
 * - where they signed up: `user_metadata.signup_brand`, recorded from 27 Oct 2026; older accounts have none.
 * - where they have been since: `user_analytics.event_data.site` on their activity, recorded from 3 Nov 2026.
 * An account with neither is shown as unknown, never guessed.
 */
export type UserSite = "rw" | "ncu" | "app"

export const USER_SITE_LABEL: Record<UserSite, string> = { rw: "RW", ncu: "NCU", app: "App" }

export function signupSite(meta: Record<string, unknown> | null | undefined): "rw" | "ncu" | null {
  const brand = String(meta?.signup_brand ?? "")
  if (brand === "recruitwrestlers") return "rw"
  if (brand === "ncunited") return "ncu"
  return null
}

export function asUserSite(v: unknown): UserSite | null {
  return v === "rw" || v === "ncu" || v === "app" ? v : null
}

export type UserSiteFacts = {
  signup_site: "rw" | "ncu" | null
  /** Site of the most recent sign-in we recorded. */
  signin_site: UserSite | null
  /** Site of the most recent tagged activity. */
  last_site: UserSite | null
  /** Every site they used in the last 30 days, most recent first. */
  sites_30d: UserSite[]
}

export type SiteFilter = "all" | UserSite | "unknown"

/** A user is on a site if they signed up there or have used it in the last 30 days. */
export function matchesSiteFilter(user: UserSiteFacts, filter: SiteFilter): boolean {
  if (filter === "all") return true
  if (filter === "unknown") return !user.signup_site && user.sites_30d.length === 0
  return user.signup_site === filter || user.sites_30d.includes(filter)
}

const SIGN_IN_EVENTS = new Set(["signin_completed", "verification_completed", "signup_completed"])

/** Folds one user's analytics rows, newest first, into their site facts. */
export function rollUpSites(rows: Array<{ event_type: string | null; site: unknown }>): Omit<UserSiteFacts, "signup_site"> {
  let signin_site: UserSite | null = null
  const seen: UserSite[] = []
  for (const row of rows) {
    const site = asUserSite(row.site)
    if (!site) continue
    if (!seen.includes(site)) seen.push(site)
    if (!signin_site && SIGN_IN_EVENTS.has(String(row.event_type ?? ""))) signin_site = site
  }
  return { signin_site, last_site: seen[0] ?? null, sites_30d: seen }
}
