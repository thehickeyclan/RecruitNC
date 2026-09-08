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

export type { SidearmScheduleEvent } from "./sidearm"

export type ParsedSchedule = {
  events: SidearmScheduleEvent[]
  /** Which layout answered — worth logging, because a school changing it explains a sudden zero. */
  layout: "nuxt" | "classic" | "none"
}

export function parseCollegeSchedule(html: string): ParsedSchedule {
  const nuxt = parseSidearmSchedule(html)
  if (nuxt.length) return { events: nuxt, layout: "nuxt" }

  const classic = parseSidearmClassicSchedule(html)
  if (classic.length) return { events: classic, layout: "classic" }

  return { events: [], layout: "none" }
}
