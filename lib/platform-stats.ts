/**
 * The numbers that sell the platform: college coaches on it, the programs they coach, and every
 * profile view they have made (Matt, 14 October 2026, for the /rankings page).
 *
 * Counted, never typed. A coach is a non-admin profile whose role is college coach
 * (lib/viewer-role.ts), less our own test accounts and the App Store review login, which would
 * otherwise each be "a coach" and "a program". Views are profile_view events by those coaches,
 * all time.
 *
 * A program is a dot on the college map with an approved coach on it — the same set the map's
 * "On RecruitWrestlers" filter counts (lib/college-programs/load.ts). It used to be the coach's
 * linked school or whatever institution they had typed, which counted two more than the map did:
 * the /command-center page said 86 programs a few hundred pixels above a filter reading 84
 * (Matt's review, 3 Nov 2026). The map's number is the one a family can click and check, so it
 * wins, and every surface reads it from here.
 *
 * Cached for an hour in memory: these move by a handful a day, and the page is public.
 */
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { schoolsWithApprovedCoaches } from "@/lib/college-programs/load"
import { classifyViewer } from "@/lib/viewer-role"

export type PlatformStats = {
  coaches: number
  /** College map programs with an approved coach: the map's own "On RecruitWrestlers" count. */
  programs: number
  /** Every profile view by a college coach, all time. */
  coachViews: number
  /** Distinct wrestler profiles those views reached. */
  profilesViewed: number
}

const NOT_A_COACH_EMAIL = /(^test@example\.com$)|(\+applereview@)|(^testcoach\.)/i
const NOT_A_PROGRAM = /^(nc wrestling united|app review)$/i

let cached: { at: number; value: PlatformStats } | null = null
let inFlight: Promise<PlatformStats> | null = null
const HOUR = 3_600_000

/*
 * A partial answer is still held, just briefly. Refusing to cache one is what took the site down
 * three times in the week to 5 November 2026: a busy database made the programs lookup return 0,
 * the result went uncached, and every following request re-ran the whole fifteen-query sweep,
 * which made the database busier still. Load caused the failure and the failure multiplied the
 * load. Two minutes recovers a real number quickly without ever leaving the page uncached.
 */
const PARTIAL = 120_000

/*
 * A page is never larger than this many rows, and a sweep never runs more than MAX_PAGES of them.
 * The cap is a backstop, not a limit we expect to reach: at 66,000 analytics rows a sweep is 13
 * pages, and if the table ever grows enough to need 100 the page should be reading a rollup
 * instead of the raw rows.
 */
const PAGE = 1000
const MAX_PAGES = 100

/**
 * Page by the last id seen, never by OFFSET. OFFSET re-reads and discards every row it skips, so
 * the last page of a sweep costs as much as the whole table: measured on 5 Nov 2026, the same
 * query at OFFSET 50,000 abandoned the event_type index and scanned all 66,336 buffers to return
 * nothing.
 */
async function pageAll(build: (afterId: string | number | null) => PromiseLike<unknown>): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = []
  let after: string | number | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = (await build(after)) as { data: Array<Record<string, unknown>> | null; error: unknown }
    if (error || !data?.length) break
    out.push(...data)
    after = data[data.length - 1]?.id as string | number
    if (data.length < PAGE || after == null) break
  }
  return out
}

export async function loadPlatformStats(admin: SupabaseClient): Promise<PlatformStats> {
  // A complete answer is good for an hour; an incomplete one for two minutes. Either way it is held.
  if (cached && Date.now() - cached.at < (cached.value.programs > 0 ? HOUR : PARTIAL)) return cached.value
  // One sweep at a time per instance. Without this every concurrent request on a cold lambda
  // starts its own, and they contend for the same connections they are waiting on.
  if (inFlight) return inFlight
  inFlight = computePlatformStats(admin)
    .then((value) => {
      cached = { at: Date.now(), value }
      return value
    })
    .catch((err: unknown) => {
      // Last good numbers beat recomputing while the database is already struggling.
      if (cached) return cached.value
      throw err
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

async function computePlatformStats(admin: SupabaseClient): Promise<PlatformStats> {
  const profiles = await pageAll((after) => {
    let q = admin
      .from("user_profiles")
      .select("id, user_id, email, role, profile_type, verified_coach, is_admin, institution, school_id")
      .order("id")
      .limit(PAGE)
    if (after !== null) q = q.gt("id", after)
    return q
  })

  const coaches = profiles.filter(
    (p) =>
      p.is_admin !== true &&
      classifyViewer(p as never).isCollegeCoach &&
      // Approved coaches only: a rejected sign-up is not a coach on the platform (Matt's own
      // rejected test account was counted on 5 Nov 2026, 122 against 121 real).
      classifyViewer(p as never).verifiedCoach &&
      !NOT_A_COACH_EMAIL.test(String(p.email ?? "")) &&
      !NOT_A_PROGRAM.test(String(p.institution ?? "").trim()),
  )
  // The map's own count, so the stats band and the map filter never disagree on the same page.
  // A failed lookup leaves it at 0, which the sales bands drop rather than print, and the hour's
  // cache is skipped below so the next request tries again instead of hiding the row all hour.
  /*
   * schoolsWithApprovedCoaches throws on any database error, a statement timeout included, and a
   * single one of those used to zero this number and so skip the cache entirely. The last good
   * count is a far better answer than 0: programs move by a handful a week, and holding one keeps
   * the whole block cacheable through exactly the busy moment that caused the failure.
   */
  const programs = (await schoolsWithApprovedCoaches(admin).catch(() => null))?.size ?? cached?.value.programs ?? 0

  const coachIds = new Set(coaches.map((c) => String(c.user_id)))
  let coachViews = 0
  const reached = new Set<string>()
  const views = await pageAll((after) => {
    let q = admin
      .from("user_analytics")
      .select("id, user_id, event_data")
      .eq("event_type", "profile_view")
      .not("user_id", "is", null)
      .order("id")
      .limit(PAGE)
    if (after !== null) q = q.gt("id", after)
    return q
  })
  for (const row of views as Array<{ user_id: string | null; event_data: { athlete_id?: string } | null }>) {
    if (!coachIds.has(String(row.user_id))) continue
    coachViews += 1
    if (row.event_data?.athlete_id) reached.add(row.event_data.athlete_id)
  }

  return { coaches: coaches.length, programs, coachViews, profilesViewed: reached.size }
}
