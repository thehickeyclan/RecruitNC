/**
 * What the users dashboard can say about how the site is actually used.
 *
 * Everything here is pure so it can be tested. The endpoint's job is to fetch rows and hand them
 * over; the decisions — which window a view falls in, what section a path belongs to, who counts
 * as a heavy user — live where they can be checked.
 *
 * Days are bucketed in Eastern time, not UTC. A North Carolina admin looking at "today" at nine in
 * the evening means today where they are, and UTC would have rolled over four hours earlier.
 */

export type ViewRow = {
  userId: string | null
  path: string
  createdAt: string
}

export const ET_TIME_ZONE = "America/New_York"

/** The calendar day a timestamp falls on in Eastern time, as YYYY-MM-DD. */
export function easternDay(iso: string, timeZone: string = ET_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "01"
  return `${get("year")}-${get("month")}-${get("day")}`
}

export type SectionKey =
  | "toc"
  | "profiles"
  | "rankings"
  | "clubs"
  | "schools"
  | "news"
  | "store"
  | "account"
  | "admin"
  | "home"
  | "other"

export const SECTION_LABELS: Record<SectionKey, string> = {
  toc: "Tournament of Champions",
  profiles: "Athlete profiles",
  rankings: "Rankings and prospects",
  clubs: "Clubs",
  schools: "Schools",
  news: "News",
  store: "Store",
  account: "Sign in and account",
  admin: "Admin",
  home: "Home",
  other: "Everything else",
}

/**
 * Which part of the site a path belongs to.
 *
 * Order matters: /admin/toc/field is admin work, not somebody reading about the tournament, so
 * admin is tested before everything else. Counting your own team's browsing as public interest
 * in TOC would overstate it by a third — /admin paths are a tenth of all views today.
 */
export function classifyPath(rawPath: string): SectionKey {
  const path = String(rawPath ?? "").split("?")[0].toLowerCase().replace(/\/+$/, "") || "/"

  if (path === "/") return "home"
  if (path.startsWith("/admin")) return "admin"
  if (path.startsWith("/auth") || path.startsWith("/profile") || path.startsWith("/edit-profile")) return "account"
  if (path.startsWith("/tournament-of-champions") || path.startsWith("/toc")) return "toc"
  if (
    path.startsWith("/view-profile") ||
    path.startsWith("/athletes") ||
    path.startsWith("/unified-profile")
  ) {
    return "profiles"
  }
  if (path.startsWith("/public-rankings") || path.startsWith("/rankings") || path.startsWith("/prospects")) {
    return "rankings"
  }
  if (path.startsWith("/clubs")) return "clubs"
  if (path.startsWith("/schools") || path.startsWith("/high-schools") || path.startsWith("/colleges")) return "schools"
  if (path.startsWith("/news")) return "news"
  if (
    path.startsWith("/store") ||
    path.startsWith("/product") ||
    path.startsWith("/cart") ||
    path.startsWith("/checkout")
  ) {
    return "store"
  }
  return "other"
}

export type WindowKey = "today" | "week" | "month" | "quarter" | "year" | "all"

export const WINDOW_LABELS: Record<WindowKey, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last 90 days",
  year: "This year",
  all: "All time",
}

export type WindowTotals = { views: number; people: number }

/**
 * Views and distinct signed-in people per window.
 *
 * "This year" is the calendar year, not the last 365 days — an admin reading "this year" in
 * January means since January, and a rolling year would quietly include most of the last one.
 */
export function summariseWindows(rows: readonly ViewRow[], now: Date): Record<WindowKey, WindowTotals> {
  const day = 24 * 60 * 60 * 1000
  const today = easternDay(now.toISOString())
  const yearPrefix = today.slice(0, 4)

  const within = (row: ViewRow, key: WindowKey): boolean => {
    const at = Date.parse(row.createdAt)
    if (Number.isNaN(at)) return false
    switch (key) {
      case "today":
        return easternDay(row.createdAt) === today
      case "week":
        return now.getTime() - at <= 7 * day
      case "month":
        return now.getTime() - at <= 30 * day
      case "quarter":
        return now.getTime() - at <= 90 * day
      case "year":
        return easternDay(row.createdAt).startsWith(yearPrefix)
      case "all":
        return true
    }
  }

  const out = {} as Record<WindowKey, WindowTotals>
  for (const key of Object.keys(WINDOW_LABELS) as WindowKey[]) {
    const matched = rows.filter((row) => within(row, key))
    out[key] = {
      views: matched.length,
      people: new Set(matched.map((r) => r.userId).filter(Boolean)).size,
    }
  }
  return out
}

export type MonthComparison = {
  thisMonth: WindowTotals & { label: string }
  lastMonth: WindowTotals & { label: string }
  /** Percent change in views, or null when last month had none to compare against. */
  viewChangePct: number | null
}

/** This calendar month against the last, in Eastern time. */
export function compareMonths(rows: readonly ViewRow[], now: Date): MonthComparison {
  const thisKey = easternDay(now.toISOString()).slice(0, 7)
  const [year, month] = thisKey.split("-").map(Number)
  const lastKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`

  const inMonth = (key: string) => rows.filter((row) => easternDay(row.createdAt).startsWith(key))
  const totals = (list: ViewRow[]) => ({
    views: list.length,
    people: new Set(list.map((r) => r.userId).filter(Boolean)).size,
  })

  const current = totals(inMonth(thisKey))
  const previous = totals(inMonth(lastKey))
  return {
    thisMonth: { ...current, label: thisKey },
    lastMonth: { ...previous, label: lastKey },
    viewChangePct: previous.views === 0 ? null : Math.round(((current.views - previous.views) / previous.views) * 100),
  }
}

export type PowerUser = {
  userId: string
  views: number
  /** Distinct days seen. Someone here every week beats someone who binged once. */
  activeDays: number
  lastSeen: string
  topSection: SectionKey
}

/**
 * The heaviest users in a window, by days active rather than raw views.
 *
 * A single long session can rack up more views than a month of daily visits, and the second person
 * is the one worth knowing about. Views break the tie.
 */
export function findPowerUsers(rows: readonly ViewRow[], limit = 25): PowerUser[] {
  const byUser = new Map<string, { views: number; days: Set<string>; last: string; sections: Map<SectionKey, number> }>()

  for (const row of rows) {
    if (!row.userId) continue
    const entry = byUser.get(row.userId) ?? { views: 0, days: new Set<string>(), last: row.createdAt, sections: new Map() }
    entry.views += 1
    entry.days.add(easternDay(row.createdAt))
    if (Date.parse(row.createdAt) > Date.parse(entry.last)) entry.last = row.createdAt
    const section = classifyPath(row.path)
    entry.sections.set(section, (entry.sections.get(section) ?? 0) + 1)
    byUser.set(row.userId, entry)
  }

  return [...byUser.entries()]
    .map(([userId, entry]) => ({
      userId,
      views: entry.views,
      activeDays: entry.days.size,
      lastSeen: entry.last,
      topSection: [...entry.sections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other",
    }))
    .sort((a, b) => b.activeDays - a.activeDays || b.views - a.views)
    .slice(0, limit)
}

export type SectionUsage = { section: SectionKey; label: string; views: number; people: number; topPaths: { path: string; views: number }[] }

/** Views grouped into sections, busiest first, with the pages driving each one. */
export function summariseSections(rows: readonly ViewRow[], pathsPerSection = 5): SectionUsage[] {
  const bySection = new Map<SectionKey, { views: number; people: Set<string>; paths: Map<string, number> }>()

  for (const row of rows) {
    const section = classifyPath(row.path)
    const entry = bySection.get(section) ?? { views: 0, people: new Set<string>(), paths: new Map() }
    entry.views += 1
    if (row.userId) entry.people.add(row.userId)
    const path = String(row.path ?? "").split("?")[0] || "/"
    entry.paths.set(path, (entry.paths.get(path) ?? 0) + 1)
    bySection.set(section, entry)
  }

  return [...bySection.entries()]
    .map(([section, entry]) => ({
      section,
      label: SECTION_LABELS[section],
      views: entry.views,
      people: entry.people.size,
      topPaths: [...entry.paths.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, pathsPerSection)
        .map(([path, views]) => ({ path, views })),
    }))
    .sort((a, b) => b.views - a.views)
}

export type DailyPoint = { day: string; views: number; people: number }

/**
 * Views and distinct people per day, oldest first, with no gaps.
 *
 * Missing days are filled with zeros rather than skipped. A line that jumps straight from Monday
 * to Thursday draws a slope where there was silence, which reads as a gentle decline instead of
 * two dead days.
 */
export function buildDailySeries(rows: readonly ViewRow[], from: Date, to: Date): DailyPoint[] {
  const byDay = new Map<string, { views: number; people: Set<string> }>()
  for (const row of rows) {
    const day = easternDay(row.createdAt)
    const entry = byDay.get(day) ?? { views: 0, people: new Set<string>() }
    entry.views += 1
    if (row.userId) entry.people.add(row.userId)
    byDay.set(day, entry)
  }

  const out: DailyPoint[] = []
  const cursor = new Date(`${easternDay(from.toISOString())}T12:00:00Z`)
  const last = easternDay(to.toISOString())
  for (let guard = 0; guard < 4000; guard += 1) {
    const day = easternDay(cursor.toISOString())
    const entry = byDay.get(day)
    out.push({ day, views: entry?.views ?? 0, people: entry?.people.size ?? 0 })
    if (day >= last) break
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return out
}

export type Insight = {
  /** "up" and "down" colour the line; "flat" and "note" stay neutral. */
  tone: "up" | "down" | "flat" | "note"
  text: string
}

/**
 * Plain observations, computed rather than guessed.
 *
 * Every number here comes from the rows. Nothing is estimated and nothing is phrased as a
 * prediction — an admin acting on "TOC is up 158%" needs it to be arithmetic, not a hunch.
 */
export function buildInsights(rows: readonly ViewRow[], now: Date): Insight[] {
  const insights: Insight[] = []
  if (rows.length === 0) return [{ tone: "note", text: "No activity recorded yet." }]

  const months = compareMonths(rows, now)
  if (months.viewChangePct !== null) {
    const up = months.viewChangePct >= 0
    insights.push({
      tone: up ? "up" : "down",
      text: `Traffic is ${up ? "up" : "down"} ${Math.abs(months.viewChangePct)}% this month — ${months.thisMonth.views.toLocaleString()} views from ${months.thisMonth.people} people, against ${months.lastMonth.views.toLocaleString()} from ${months.lastMonth.people} last month.`,
    })
  }

  // Which section grew most, month on month, ignoring the team's own admin work.
  const thisKey = easternDay(now.toISOString()).slice(0, 7)
  const [year, month] = thisKey.split("-").map(Number)
  const lastKey = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`
  const inMonth = (key: string) => rows.filter((r) => easternDay(r.createdAt).startsWith(key))
  const sectionCounts = (list: ViewRow[]) => {
    const counts = new Map<SectionKey, number>()
    for (const row of list) {
      const section = classifyPath(row.path)
      if (section === "admin") continue
      counts.set(section, (counts.get(section) ?? 0) + 1)
    }
    return counts
  }
  const current = sectionCounts(inMonth(thisKey))
  const previous = sectionCounts(inMonth(lastKey))
  let best: { section: SectionKey; change: number; now: number } | null = null
  for (const [section, count] of current) {
    const before = previous.get(section) ?? 0
    if (before < 20) continue // Too small a base for a percentage to mean anything.
    const change = Math.round(((count - before) / before) * 100)
    if (!best || change > best.change) best = { section, change, now: count }
  }
  if (best && best.change > 0) {
    insights.push({
      tone: "up",
      text: `${SECTION_LABELS[best.section]} grew fastest, up ${best.change}% to ${best.now.toLocaleString()} views this month.`,
    })
  }

  const busiest = [...buildDailySeries(rows, new Date(Date.now() - 90 * 24 * 3600 * 1000), now)]
    .sort((a, b) => b.views - a.views)[0]
  if (busiest && busiest.views > 0) {
    insights.push({ tone: "note", text: `Busiest day in the last 90 was ${busiest.day} with ${busiest.views.toLocaleString()} views.` })
  }

  const adminViews = rows.filter((r) => classifyPath(r.path) === "admin").length
  const adminPeople = new Set(rows.filter((r) => classifyPath(r.path) === "admin").map((r) => r.userId).filter(Boolean)).size
  if (adminViews > 0) {
    insights.push({
      tone: "note",
      text: `${Math.round((adminViews / rows.length) * 100)}% of all views are admin pages, from ${adminPeople} ${adminPeople === 1 ? "person" : "people"} — your own team, counted separately below.`,
    })
  }

  const returning = findPowerUsers(rows, 500).filter((u) => u.activeDays >= 5).length
  insights.push({
    tone: returning > 0 ? "up" : "flat",
    text: `${returning} ${returning === 1 ? "person has" : "people have"} visited on five or more separate days.`,
  })

  return insights
}
