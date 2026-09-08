/**
 * One entry point for a college wrestling schedule page, whichever Sidearm layout it runs.
 *
 * Every NC program is on Sidearm, but on two different generations of it: NC State, Duke, UNC and
 * Davidson render from a Nuxt payload, while App State, Campbell and Mount Olive still serve the
 * older markup. Callers should not have to know which, and a school switching generations mid
 * season should not need a code change — so both are tried and whichever yields a schedule wins.
 */
import { parseSidearmSchedule, type SidearmScheduleEvent } from "./sidearm"
import { parseSidearmClassicSchedule } from "./sidearm-classic"
import { isInSeason } from "./season"

export type { SidearmScheduleEvent } from "./sidearm"

export type ParsedSchedule = {
  events: SidearmScheduleEvent[]
  /** Which layout answered — worth logging, because a school changing it explains a sudden zero. */
  layout: "nuxt" | "classic" | "none"
  /** Everything the page held, before the season filter. Lets a caller tell "no schedule posted
   * yet" apart from "the site served us a different season", which read identically otherwise. */
  parsedCount: number
  /** The season asked for, when one was. */
  season?: string
}

/**
 * @param season "2026-27" to keep only that season. Omit to take whatever the page held.
 *
 * Filtering here rather than at the fetch is deliberate: a site cannot be asked for a season it
 * has not posted. The Nuxt sites answer a 2026-27 URL with a 200 and last season's meets, and the
 * classic ones redirect to the season in progress, so both hand back 2025-26 looking like a
 * success. Dropping out-of-season rows is what actually keeps a finished season out of the
 * calendar — and a page that yields plenty of events but none in season is a schedule that has
 * not been announced, not a broken parser, which `parsedCount` lets the caller say out loud.
 */
export function parseCollegeSchedule(html: string, season?: string): ParsedSchedule {
  const nuxt = parseSidearmSchedule(html)
  const parsed = nuxt.length ? nuxt : parseSidearmClassicSchedule(html)
  const layout: ParsedSchedule["layout"] = nuxt.length ? "nuxt" : parsed.length ? "classic" : "none"

  const events = season ? parsed.filter((event) => isInSeason(event.date, season)) : parsed
  return { events, layout, parsedCount: parsed.length, season }
}
