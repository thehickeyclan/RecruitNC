/**
 * RecruitWrestlers vs NC United, counted (Matt, 1 Nov 2026). Events carry event_data.site from
 * 1 Nov 2026 (lib/analytics-site.ts); older rows have none and are counted as "untagged", never
 * guessed. New accounts come from the sign-up brand stamped on the account.
 */
export type SiteKey = "rw" | "ncu" | "app" | "untagged"

export type SiteEvent = { user_id: string | null; event_type: string; created_at: string; event_data: { site?: string | null } | null }
export type SiteAccount = { created_at: string; signup_brand?: string | null }

export type SiteCounts = {
  accounts: number
  claims: number
  visitors: number
  pageViews: number
  signIns: number
  checkouts: number
}

export const SITE_KEYS: SiteKey[] = ["rw", "ncu", "app", "untagged"]

function siteOf(e: SiteEvent): SiteKey {
  const s = e.event_data?.site
  return s === "rw" || s === "ncu" || s === "app" ? s : "untagged"
}

export function splitBySite(events: SiteEvent[], accounts: SiteAccount[], since: string): Record<SiteKey, SiteCounts> {
  const out = Object.fromEntries(
    SITE_KEYS.map((k) => [k, { accounts: 0, claims: 0, visitors: 0, pageViews: 0, signIns: 0, checkouts: 0 }]),
  ) as Record<SiteKey, SiteCounts>
  const visitors = Object.fromEntries(SITE_KEYS.map((k) => [k, new Set<string>()])) as Record<SiteKey, Set<string>>

  for (const e of events) {
    if (e.created_at < since) continue
    const k = siteOf(e)
    if (e.event_type === "profile_claimed") out[k].claims++
    else if (e.event_type === "signin_completed") out[k].signIns++
    else if (e.event_type === "checkout_started") out[k].checkouts++
    else if (e.event_type === "page_view") {
      out[k].pageViews++
      if (e.user_id) visitors[k].add(e.user_id)
    }
  }
  for (const k of SITE_KEYS) out[k].visitors = visitors[k].size

  for (const a of accounts) {
    if (a.created_at < since) continue
    out[a.signup_brand === "recruitwrestlers" ? "rw" : a.signup_brand === "ncunited" ? "ncu" : "untagged"].accounts++
  }
  return out
}

function easternParts(at: Date): { day: string; offset: string } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", timeZoneName: "shortOffset" }).formatToParts(at)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const [h, m = "0"] = (get("timeZoneName").replace("GMT", "") || "+0").split(":")
  const sign = h.startsWith("-") ? "-" : "+"
  return { day: `${get("year")}-${get("month")}-${get("day")}`, offset: `${sign}${String(Math.abs(Number(h))).padStart(2, "0")}:${m.padStart(2, "0")}` }
}

/**
 * Midnight in North Carolina today, as an ISO instant. The offset is the one in force at that
 * midnight, not now: on the day the clocks change they differ by an hour.
 */
export function startOfTodayEastern(now = new Date()): string {
  const { day, offset } = easternParts(now)
  const guess = new Date(`${day}T00:00:00${offset}`)
  return new Date(`${day}T00:00:00${easternParts(guess).offset}`).toISOString()
}
