/**
 * The menu's "new" marks (Matt, 27 Oct 2026: "'1' new message, '2' new reports, 'New rankings
 * published'"). The server says what exists and when it came out (app/api/nav/new); the browser
 * remembers what this person has opened. Messages and Interested count on the server already.
 */

/** What the server reports. Dates are ISO strings; a report's is its event day. */
export type NavNewFeed = {
  reports: { slug: string; date: string }[]
  rankingsPublishedAt: string | null
  newsDate: string | null
}

/** What this browser has opened. `since` is when it started keeping track. */
export type NavSeen = { since: string; reports: string[]; rankings: string | null; news: string | null }

/** Anything older than this on a first visit is not "new": nobody wants a badge for September. */
export const FIRST_VISIT_WINDOW_DAYS = 14

export function freshSeen(now: Date): NavSeen {
  return { since: new Date(now.getTime() - FIRST_VISIT_WINDOW_DAYS * 86_400_000).toISOString(), reports: [], rankings: null, news: null }
}

const t = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).getTime() : 0)

export function navNewCounts(feed: NavNewFeed, seen: NavSeen): { reports: number; rankings: boolean; news: boolean } {
  const since = t(seen.since)
  const opened = new Set(seen.reports)
  const after = (date: string | null, mark: string | null) => t(date) > Math.max(since, t(mark))
  return {
    reports: feed.reports.filter((r) => !opened.has(r.slug) && t(r.date) > since).length,
    rankings: after(feed.rankingsPublishedAt, seen.rankings),
    news: after(feed.newsDate, seen.news),
  }
}

/** Opening the page clears its mark: a report by its address, rankings and news by their section. */
export function markSeen(seen: NavSeen, pathname: string, now: Date): NavSeen {
  const at = now.toISOString()
  const report = pathname.match(/^\/coach-reports\/([^/?#]+)/)?.[1]
  if (report && !seen.reports.includes(report)) return { ...seen, reports: [...seen.reports, report] }
  if (/^\/(public-rankings|rankings)(\/|$)/.test(pathname)) return { ...seen, rankings: at }
  if (/^\/(news|recaps)(\/|$)/.test(pathname)) return { ...seen, news: at }
  return seen
}
