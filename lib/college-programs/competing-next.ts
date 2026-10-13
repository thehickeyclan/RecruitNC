/**
 * "Competing next": a wrestler's upcoming events, shown to the people who should see them.
 *
 * It is a minor's whereabouts on a known date, so it is not public (Matt, 13 Oct 2026). It is
 * visible to the wrestler's own family, to college coaches staff have approved - the same bar as
 * messaging - and to admins. Nobody else, and never in the public profile payload.
 */

export type CompetingEvent = { title: string; startDate: string; endDate: string | null; location: string | null }

export type RecruitAtEvent = { id: string; name: string; classYear: number | null; weight: string | null; highSchool: string | null }

export type EventWithRecruits = CompetingEvent & { recruits: RecruitAtEvent[] }

/** Today in North Carolina. In UTC an event starting today vanished at 8pm the evening before it ended. */
export function easternToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

/** Still to come, or under way: a two-day tournament is "next" on its second morning too. */
export function isStillOn(event: { startDate: string; endDate: string | null }, today: string): boolean {
  return (event.endDate ?? event.startDate) >= today
}

/** Families type the same event differently ("Super 32", "Super32", "super 32 "); a coach should see one line. */
const eventKey = (e: CompetingEvent) => `${e.startDate}|${e.title.toLowerCase().replace(/[^a-z0-9]+/g, "")}`

/**
 * A coach's recruits grouped by the event they are at, soonest first - so he can plan one trip
 * around several wrestlers.
 */
export function groupRecruitsByEvent(
  rows: Array<CompetingEvent & { athleteId: string }>,
  recruits: Map<string, RecruitAtEvent>,
): EventWithRecruits[] {
  const groups = new Map<string, EventWithRecruits>()
  for (const row of rows) {
    const recruit = recruits.get(row.athleteId)
    if (!recruit) continue
    const key = eventKey(row)
    const group = groups.get(key) ?? { title: row.title, startDate: row.startDate, endDate: row.endDate, location: row.location, recruits: [] }
    // The longest end date and any location one family gave fill in for those who gave less.
    if (row.endDate && (!group.endDate || row.endDate > group.endDate)) group.endDate = row.endDate
    if (!group.location && row.location) group.location = row.location
    if (!group.recruits.some((r) => r.id === recruit.id)) group.recruits.push(recruit)
    groups.set(key, group)
  }
  return [...groups.values()]
    .map((g) => ({ ...g, recruits: g.recruits.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || b.recruits.length - a.recruits.length)
}
