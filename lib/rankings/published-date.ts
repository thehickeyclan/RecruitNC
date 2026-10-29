/**
 * "Published September 27, 2026" — the date a board was generated (Matt, 14 October 2026).
 *
 * Every ranking says when it was published, so a reader can tell a fresh board from a stale one
 * and nobody quotes last month's order as today's. Eastern time: a board published at 8pm in
 * Raleigh is that day's board, not the next day's, which is what UTC would print.
 */
export function publishedDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `Published ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })}`
}

/**
 * "Last updated October 29, 2026 · 12:43 PM ET" — the publish moment, to the minute (Matt, 29
 * October 2026: a time and date stamp on every board).
 */
export function lastUpdatedLabel(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const day = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" })
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
  return `Last updated ${day} · ${time} ET`
}
