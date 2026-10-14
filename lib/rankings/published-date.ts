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
