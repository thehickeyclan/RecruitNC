/**
 * Weekly college coach usage (2 Nov 2026): coach adoption is the number that matters most, so it
 * gets its own admin page (app/admin/coach-usage), split by site like /admin/sites.
 *
 * Who is a college coach comes from three places, and missing any one undercounts (31 Oct 2026:
 * one source and an unpaged select said 87; there were 133):
 *   1. user_profiles.profile_type = 'college-coach' (or role college_coach);
 *   2. user_profiles.verified_coach on other rows - not admins, athletes or NC United's own staff;
 *   3. auth user_metadata naming a college coach (profile_type or role), whatever the profile row says.
 * Internal accounts (Apple review, staff test logins) and test/example addresses are left out.
 * A .edu address is never evidence on its own.
 */
import { isInternalAccount } from "@/lib/internal-accounts"
import { normalizeRole } from "@/lib/viewer-role"

export type SiteKey = "rw" | "ncu" | "app" | "untagged"
export const USAGE_SITES: SiteKey[] = ["rw", "ncu", "app", "untagged"]

export type ProfileRow = { user_id: string; email: string | null; role: string | null; profile_type: string | null; verified_coach: boolean | null; institution: string | null; is_admin?: boolean | null }
export type AuthRow = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }

const excludedEmail = (email: string | null | undefined) => /thehickeyclan|test|example/i.test(String(email ?? "")) || isInternalAccount(email)

/** The college coach accounts, as user ids. */
export function collegeCoachIds(profiles: ProfileRow[], users: AuthRow[]): Set<string> {
  const out = new Set<string>()
  const ruledOut = new Set<string>()
  for (const p of profiles) {
    const role = normalizeRole(p.role)
    if (role === "admin" || p.is_admin === true || role === "athlete" || excludedEmail(p.email)) {
      ruledOut.add(p.user_id)
      continue
    }
    if (normalizeRole(p.profile_type) === "college_coach" || role === "college_coach") out.add(p.user_id)
    else if (p.verified_coach === true && !/nc united/i.test(p.institution ?? "")) out.add(p.user_id)
  }
  for (const u of users) {
    if (ruledOut.has(u.id) || excludedEmail(u.email)) continue
    const m = u.user_metadata ?? {}
    if (normalizeRole(m.profile_type) === "college_coach" || normalizeRole(m.role) === "college_coach") out.add(u.id)
  }
  return out
}

export type UsageEvent = { user_id: string | null; event_type: string; created_at: string; event_data: { site?: string | null; athlete_id?: string | null } | null }
export type StarRow = { coach_user_id: string; athlete_id: string; starred_at: string | null }
export type NeedRow = { posted_by: string; site: string | null; created_at: string; confirmed_at: string; cleared_at: string | null }

export type WeekCounts = {
  activeCoaches: number
  profilesReviewed: number
  profileViews: number
  starred: number
  /** Distinct coaches who starred: one staff starring 463 in an afternoon (27 Oct 2026) is one coach. */
  starringCoaches: number
  needsPosted: number
}

export type WeekRow = { label: string; since: string; until: string; bySite: Record<SiteKey, WeekCounts>; all: WeekCounts }

const siteOf = (s: string | null | undefined): SiteKey => (s === "rw" || s === "ncu" || s === "app" ? s : "untagged")
const empty = (): WeekCounts => ({ activeCoaches: 0, profilesReviewed: 0, profileViews: 0, starred: 0, starringCoaches: 0, needsPosted: 0 })

/**
 * One row per week, newest first. "Active" is any tracked event, star or need in the week.
 * "Profiles reviewed" is distinct wrestlers a coach opened; views count every open. Stars carry
 * no site, so they are counted under All only.
 */
export function weeklyUsage(input: { coaches: Set<string>; events: UsageEvent[]; stars: StarRow[]; needs: NeedRow[]; now: Date; weeks: number }): WeekRow[] {
  const rows: WeekRow[] = []
  for (let w = 0; w < input.weeks; w++) {
    const until = new Date(input.now.getTime() - w * 7 * 86_400_000).toISOString()
    const since = new Date(input.now.getTime() - (w + 1) * 7 * 86_400_000).toISOString()
    const inWeek = (at: string | null | undefined) => Boolean(at) && at! >= since && at! < until
    const bySite = Object.fromEntries(USAGE_SITES.map((k) => [k, empty()])) as Record<SiteKey, WeekCounts>
    const all = empty()
    const active = Object.fromEntries(USAGE_SITES.map((k) => [k, new Set<string>()])) as Record<SiteKey, Set<string>>
    const reviewed = Object.fromEntries(USAGE_SITES.map((k) => [k, new Set<string>()])) as Record<SiteKey, Set<string>>
    const activeAll = new Set<string>()
    const reviewedAll = new Set<string>()
    for (const e of input.events) {
      if (!e.user_id || !input.coaches.has(e.user_id) || !inWeek(e.created_at)) continue
      const k = siteOf(e.event_data?.site)
      active[k].add(e.user_id)
      activeAll.add(e.user_id)
      if (e.event_type === "profile_view" && e.event_data?.athlete_id) {
        bySite[k].profileViews++
        all.profileViews++
        reviewed[k].add(String(e.event_data.athlete_id))
        reviewedAll.add(String(e.event_data.athlete_id))
      }
    }
    const starring = new Set<string>()
    for (const s of input.stars) {
      if (!input.coaches.has(s.coach_user_id) || !inWeek(s.starred_at)) continue
      all.starred++
      starring.add(s.coach_user_id)
      activeAll.add(s.coach_user_id)
    }
    for (const n of input.needs) {
      if (!inWeek(n.created_at)) continue
      const k = siteOf(n.site)
      bySite[k].needsPosted++
      all.needsPosted++
      active[k].add(n.posted_by)
      activeAll.add(n.posted_by)
    }
    for (const k of USAGE_SITES) {
      bySite[k].activeCoaches = active[k].size
      bySite[k].profilesReviewed = reviewed[k].size
    }
    all.starringCoaches = starring.size
    all.activeCoaches = activeAll.size
    all.profilesReviewed = reviewedAll.size
    rows.push({ label: w === 0 ? "Last 7 days" : w === 1 ? "Week before" : `${w} weeks back`, since, until, bySite, all })
  }
  return rows
}
