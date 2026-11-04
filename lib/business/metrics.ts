/**
 * The six numbers the business runs on, week by week, by state and by gender.
 *
 * Matt, 4 November 2026: "graphs that show all the key metrics; profile claims, creation, edits,
 * college views, college stars, logins.. by state male/female". Each one has a real dated source,
 * so these are trend lines, not snapshots:
 *
 *   profiles_created   athletes.created_at                          from 30 Apr 2025
 *   profiles_claimed   athletes.claimed_at                          from 29 Jul 2025
 *   profile_edits      athlete_audit_log, change_type=athlete_edit  from 12 Jan 2026
 *   coach_views        user_analytics profile_view, verified college coaches only, from  3 Feb 2026
 *   coach_stars        college_coach_stars.starred_at               from  4 Nov 2025
 *   sign_ins           user_analytics signin_completed              from 19 Jul 2026
 *
 * Those start dates are when each source began recording, measured 4 November 2026, not when the
 * thing itself began happening. Wrestlers were signing in long before July 2026; the event that
 * counts a sign-in is what is young. A chart that drew zeroes back to 2025 would read as a
 * collapse, so each series reports where it can first speak for itself.
 *
 * Two honest limits are built in rather than papered over:
 *
 * - **The site stamp is younger than the data.** `event_data.site` has been on events since
 *   1 November 2026 (lib/site-split.ts), and three of the six series do not come from events at
 *   all, so they can never carry one. Filtering by RecruitWrestlers or NC United therefore hides
 *   the series that cannot answer, instead of guessing a site for them.
 * - **A sign-in belongs to an account, not a wrestler.** Its state and gender are the claimed
 *   wrestler's; an account that has claimed nobody has neither, and lands in "unassigned". Those
 *   rows are counted and reported, never silently dropped into a state.
 *
 * Everything here is pure so it can be tested without a database. Loading lives in ./load.ts.
 */

export const METRICS = [
  "profiles_created",
  "profiles_claimed",
  "profile_edits",
  "coach_views",
  "coach_stars",
  "sign_ins",
] as const

export type Metric = (typeof METRICS)[number]

export const METRIC_LABEL: Record<Metric, string> = {
  profiles_created: "Profiles created",
  profiles_claimed: "Profiles claimed",
  profile_edits: "Profile edits",
  coach_views: "College views",
  coach_stars: "College stars",
  sign_ins: "Logins",
}

/** Which series carry `event_data.site`, and so can answer a RecruitWrestlers / NC United filter. */
export const METRIC_HAS_SITE: Record<Metric, boolean> = {
  profiles_created: false,
  profiles_claimed: true,
  profile_edits: false,
  coach_views: true,
  coach_stars: false,
  sign_ins: true,
}

/**
 * The earliest date each series can speak for: the first row its source holds, read on
 * 4 November 2026. A chart must not draw a flat line before it. Re-measure with
 * `scripts/business-metrics.ts --starts` if a source is ever backfilled.
 */
export const METRIC_STARTS: Record<Metric, string> = {
  profiles_created: "2025-04-30",
  profiles_claimed: "2025-07-29",
  profile_edits: "2026-01-12",
  coach_views: "2026-02-03",
  coach_stars: "2025-11-04",
  sign_ins: "2026-07-19",
}

export type Gender = "Male" | "Female"
export type SiteKey = "rw" | "ncu" | "app" | "untagged"

/** One wrestler's dimensions: the state they count for, their gender and their class. */
export type AthleteDim = { state: string | null; gender: Gender | null; classYear: number | null }

/** One dated thing that happened, already attributed to a wrestler where it can be. */
export type MetricEvent = {
  at: string
  /** The wrestler this is about, or null when it is about an account that has claimed nobody. */
  athleteId: string | null
  /** The site stamp, for the series that carry one. */
  site?: SiteKey | null
  /** The college program behind a view or a star. A program, never a coach's name. */
  by?: string | null
}

export type Filters = {
  /** A two-letter code, or "all". */
  state: string
  /** "Male", "Female" or "all". */
  gender: Gender | "all"
  /** A site key, or "all". */
  site: SiteKey | "all"
}

export const ALL_FILTERS: Filters = { state: "all", gender: "all", site: "all" }

export type Point = { week: string; count: number }

export type Series = {
  metric: Metric
  label: string
  points: Point[]
  total: number
  /** Events the filters admitted but which carry no wrestler, so no state and no gender. */
  unassigned: number
  /** Set when the filters ask this series something it cannot answer. */
  unavailable: string | null
  /** Where the source itself begins, when that is later than the window's start. Else null. */
  startsAt: string | null
}

/**
 * The Monday of the week an instant falls in, in Eastern time, as YYYY-MM-DD.
 *
 * Eastern because the business is run from North Carolina and a Sunday-night sign-up should land
 * in the week the family thinks it did, not the next one because UTC had already turned over.
 */
export function weekOf(at: string | Date): string {
  const d = at instanceof Date ? at : new Date(at)
  if (Number.isNaN(d.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  const day = `${get("year")}-${get("month")}-${get("day")}`
  const back = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[get("weekday")] ?? 0
  const monday = new Date(`${day}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - back)
  return monday.toISOString().slice(0, 10)
}

/** Every Monday from `from` to `to`, so a quiet week draws as a zero and not as a gap. */
export function weeksBetween(from: string, to: string): string[] {
  const out: string[] = []
  const start = new Date(`${weekOf(`${from}T12:00:00Z`)}T00:00:00Z`)
  const end = new Date(`${weekOf(`${to}T12:00:00Z`)}T00:00:00Z`)
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 7)) out.push(d.toISOString().slice(0, 10))
  return out
}

/** Whether one event passes the state and gender filters, given what we know about its wrestler. */
function passesDims(dim: AthleteDim | undefined, filters: Filters): boolean {
  if (filters.state === "all" && filters.gender === "all") return true
  if (!dim) return false
  if (filters.state !== "all" && dim.state !== filters.state) return false
  if (filters.gender !== "all" && dim.gender !== filters.gender) return false
  return true
}

/**
 * One metric's weekly line.
 *
 * `window` is the span to draw, as two YYYY-MM-DD dates. Events outside it are left out. A series
 * whose source begins inside the window reports `startsAt` so the chart can start the line there
 * rather than draw months of zeroes that look like a collapse.
 */
export function series(
  metric: Metric,
  events: MetricEvent[],
  dims: Map<string, AthleteDim>,
  filters: Filters,
  window: { from: string; to: string },
): Series {
  const label = METRIC_LABEL[metric]
  const weeks = weeksBetween(window.from, window.to)
  const empty = weeks.map((week) => ({ week, count: 0 }))

  if (filters.site !== "all" && !METRIC_HAS_SITE[metric]) {
    return {
      metric,
      label,
      points: empty,
      total: 0,
      unassigned: 0,
      unavailable: "No site stamp on this source, so it cannot be split by brand",
      startsAt: METRIC_STARTS[metric] > window.from ? METRIC_STARTS[metric] : null,
    }
  }

  const counts = new Map(weeks.map((w) => [w, 0]))
  let total = 0
  let unassigned = 0

  for (const e of events) {
    const day = String(e.at).slice(0, 10)
    if (!day || day < window.from || day > window.to) continue
    if (filters.site !== "all" && (e.site ?? "untagged") !== filters.site) continue
    const dim = e.athleteId ? dims.get(e.athleteId) : undefined
    if (!e.athleteId || !dim) {
      // Only counted as unassigned when the filters would otherwise have admitted it.
      if (filters.state === "all" && filters.gender === "all") {
        unassigned++
        const w = weekOf(e.at)
        if (counts.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1)
        total++
      }
      continue
    }
    if (!passesDims(dim, filters)) continue
    const w = weekOf(e.at)
    if (!counts.has(w)) continue
    counts.set(w, (counts.get(w) ?? 0) + 1)
    total++
  }

  const start = METRIC_STARTS[metric]
  return {
    metric,
    label,
    points: weeks.map((week) => ({ week, count: counts.get(week) ?? 0 })),
    total,
    unassigned,
    unavailable: null,
    startsAt: start > window.from ? start : null,
  }
}

/** The states present in the data, in order, so the picker offers only states we hold. */
export function statesPresent(dims: Map<string, AthleteDim>): string[] {
  const seen = new Set<string>()
  for (const d of dims.values()) if (d.state) seen.add(d.state)
  return [...seen].sort()
}

/**
 * One state, at a glance: what the state page shows and what the presenting slide reads from.
 *
 * Every figure is a count of wrestlers or of programs. `programs` is distinct college programs
 * that have opened a profile in this state - the number that carries a room, because it is the
 * one a family cannot get anywhere else.
 */
export type StateSummary = {
  state: string
  gender: Gender | "all"
  profiles: number
  claimed: number
  /** Profiles with a current class year, which is what a college coach can still recruit. */
  current: number
  starred: number
  /** Wrestlers a college coach has opened at least once. */
  viewed: number
  /** Distinct college programs that have opened a wrestler here. */
  programs: number
  views: number
  byClass: Array<{ classYear: number; profiles: number; claimed: number }>
}

/** The four classes a college coach can still recruit, for a season that runs July to June. */
export function currentClasses(now = new Date()): number[] {
  const seniors = now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()
  return [seniors, seniors + 1, seniors + 2, seniors + 3]
}

export function stateSummary(
  state: string,
  gender: Gender | "all",
  dims: Map<string, AthleteDim>,
  events: Record<Metric, MetricEvent[]>,
  now = new Date(),
): StateSummary {
  const mine = new Set<string>()
  const classes = currentClasses(now)
  const byClass = new Map<number, { profiles: number; claimed: number }>(classes.map((y) => [y, { profiles: 0, claimed: 0 }]))
  let profiles = 0
  let current = 0

  for (const [id, d] of dims) {
    if (d.state !== state) continue
    if (gender !== "all" && d.gender !== gender) continue
    mine.add(id)
    profiles++
    if (d.classYear && classes.includes(d.classYear)) {
      current++
      byClass.get(d.classYear)!.profiles++
    }
  }

  let claimed = 0
  for (const e of events.profiles_claimed) {
    if (!e.athleteId || !mine.has(e.athleteId)) continue
    claimed++
    const y = dims.get(e.athleteId)?.classYear
    if (y && byClass.has(y)) byClass.get(y)!.claimed++
  }

  const starred = new Set<string>()
  for (const e of events.coach_stars) if (e.athleteId && mine.has(e.athleteId)) starred.add(e.athleteId)

  const viewed = new Set<string>()
  const programs = new Set<string>()
  let views = 0
  for (const e of events.coach_views) {
    if (!e.athleteId || !mine.has(e.athleteId)) continue
    views++
    viewed.add(e.athleteId)
    if (e.by) programs.add(e.by)
  }

  return {
    state,
    gender,
    profiles,
    claimed,
    current,
    starred: starred.size,
    viewed: viewed.size,
    programs: programs.size,
    views,
    byClass: classes.map((y) => ({ classYear: y, ...byClass.get(y)! })),
  }
}
