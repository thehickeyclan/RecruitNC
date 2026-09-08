/**
 * The older Sidearm layout, which App State, Campbell and Mount Olive still run.
 *
 * No Nuxt payload here. The schedule is published twice on the page and neither copy is complete:
 * a schema.org `application/ld+json` block carries dates, opponents and venues but no scores, and
 * the rendered HTML carries the scores but expresses dates as display text. This reads the clean
 * source for the schedule and lifts the results out of the markup beside it.
 */
import { looksLikeTournament, type SidearmScheduleEvent } from "./sidearm"

type LdEvent = {
  name?: string
  startDate?: string
  eventStatus?: string
  location?: { name?: string } | string | null
}

function text(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed ? trimmed : null
}

export function extractLdEvents(html: string): LdEvent[] {
  const blocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) ?? []
  for (const block of blocks) {
    const body = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/, "")
    try {
      const parsed = JSON.parse(body)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      const events = list.filter((entry) => entry && typeof entry === "object" && "startDate" in entry)
      if (events.length) return events as LdEvent[]
    } catch {
      // A site can carry several ld+json blocks; a broken one must not lose the good one.
    }
  }
  return []
}

/**
 * One result per game block, tagged with the day it was wrestled.
 *
 * Pairing by position does not survive contact with these pages. Each game renders several times
 * — a mobile row, a desktop row, a print row — so Mount Olive publishes 51 score spans for 18
 * meets, and Campbell carries an event with no block at all. Splitting on `data-game-id` gives
 * exactly one segment per meet, and carrying the date out with the score means a missing or
 * repeated block shifts nothing.
 */
export type ClassicGameResult = {
  /** "11-08", from the "Nov 8 (Sat)" the block prints; the year comes from the ld+json event. */
  monthDay: string | null
  outcome: "W" | "L" | null
  team: number | null
  opponent: number | null
  note: string | null
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
}

function monthDayOf(segment: string): string | null {
  const label = segment.match(/sidearm-schedule-game-opponent-date[^>]*>\s*<span[^>]*>(.*?)<\/span>/)
  const text = label?.[1]?.replace(/<[^>]+>/g, "").trim()
  const parts = text?.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2})/)
  if (!parts) return null
  const month = MONTHS[parts[1].toLowerCase()]
  return month ? `${month}-${parts[2].padStart(2, "0")}` : null
}

export function extractGameResults(html: string): ClassicGameResult[] {
  const flat = html.replace(/\s+/g, " ")
  // Each meet is one `data-game-id`; everything up to the next one belongs to it.
  const segments = flat.split(/data-game-id/).slice(1)
  return segments.map((segment) => {
    const monthDay = monthDayOf(segment)
    const blocks = segment.match(/sidearm-schedule-game-result[^>]*>(.*?)<\/div>/g) ?? []
    for (const block of blocks) {
      const spans = [...block.matchAll(/<span[^>]*>(.*?)<\/span>/g)]
        .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
      if (!spans.length) continue
      const flag = spans[0].replace(/[^A-Za-z]/g, "").toUpperCase()
      const score = spans[1]?.match(/^(\d+)\s*-\s*(\d+)$/)
      if ((flag === "W" || flag === "L") && score) {
        return { monthDay, outcome: flag, team: Number(score[1]), opponent: Number(score[2]), note: null }
      }
    }
    // A tournament finish is a real result but not a score: "4 Champs, 10 Finalists".
    const prose = blocks
      .map((block) =>
        [...block.matchAll(/<span[^>]*>(.*?)<\/span>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" "),
      )
      .find(Boolean)
    return { monthDay, outcome: null, team: null, opponent: null, note: prose ?? null }
  })
}

/**
 * Split "Vs Navy (WrangleMania)" into who and where.
 *
 * The leading school name is optional and often absent: App State publishes "Appalachian State
 * University Vs Navy" while Mount Olive publishes just " Vs King ". Anchoring this on a space
 * before the At/Vs quietly turned every Mount Olive dual into a tournament with no opponent,
 * because the name is trimmed before it gets here.
 */
export function splitFixture(rawName: string): {
  homeAway: SidearmScheduleEvent["homeAway"]
  opponent: string | null
  eventName: string | null
} {
  const name = rawName.trim()
  const match = name.match(/(?:^|\s)(At|Vs)\s+(.+)$/i)
  const target = (match ? match[2] : name).replace(/\s*\([^)]*\)\s*$/, "").trim()
  if (!target) return { homeAway: "home", opponent: null, eventName: null }

  if (looksLikeTournament(target)) {
    // Nobody is the home team at an open.
    return { homeAway: "neutral", opponent: null, eventName: target }
  }
  const away = match?.[1]?.toLowerCase() === "at"
  return { homeAway: away ? "away" : "home", opponent: target, eventName: null }
}

export function parseSidearmClassicSchedule(html: string): SidearmScheduleEvent[] {
  const ldEvents = extractLdEvents(html)
  if (!ldEvents.length) return []

  /**
   * Results are claimed by date, and each is claimed once.
   *
   * Two meets on the same day is normal at a duals weekend — App State wrestled Navy and Hofstra
   * on the same Saturday — so a date can hold more than one score, and they are handed out in
   * page order, which is the order they were wrestled.
   */
  const unclaimed = new Map<string, ClassicGameResult[]>()
  for (const result of extractGameResults(html)) {
    if (!result.monthDay) continue
    const queue = unclaimed.get(result.monthDay) ?? []
    queue.push(result)
    unclaimed.set(result.monthDay, queue)
  }
  const claim = (date: string): ClassicGameResult | null => unclaimed.get(date.slice(5))?.shift() ?? null

  return ldEvents
    .map((event): SidearmScheduleEvent | null => {
      const iso = text(event.startDate)
      if (!iso) return null
      const date = iso.slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

      const { homeAway, opponent, eventName } = splitFixture(text(event.name) ?? "")
      const result = claim(date)
      const startTime = iso.length > 10 ? iso.slice(11, 16) : null
      const location =
        typeof event.location === "string" ? text(event.location) : text((event.location as { name?: string } | null)?.name)

      const status = /cancel/i.test(String(event.eventStatus ?? ""))
        ? "cancelled"
        : /postpone/i.test(String(event.eventStatus ?? ""))
          ? "postponed"
          : "scheduled"

      return {
        date,
        startTime: startTime && startTime !== "00:00" ? startTime : null,
        opponent,
        homeAway,
        location,
        tv: null,
        streamUrl: null,
        outcome: result?.outcome ?? null,
        teamScore: result?.outcome ? (result.team ?? null) : null,
        opponentScore: result?.outcome ? (result.opponent ?? null) : null,
        eventName,
        status,
      } satisfies SidearmScheduleEvent
    })
    .filter((event): event is SidearmScheduleEvent => event !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
}
