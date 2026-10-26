/**
 * "New rankings by Friday" (Matt, 26 Oct 2026): the next North Carolina rankings, with results from
 * Journeymen, I-64 and Super 32, are promised by Friday 30 October. Shown on the Super 32 recap, the
 * coach reports and the coach email. Ends the night of the 31st: a promise past its date reads as a
 * missed one (the event-clock rule).
 */
export const RANKINGS_UPDATE = {
  /** What Matt calls them (26 Oct 2026). */
  name: "North Carolina College Prospect Rankings",
  by: "Friday, October 30",
  events: "Journeymen, I-64 and Super 32",
  /** This update is the men's boards. */
  scope: "men",
}
const ENDS = Date.parse("2026-10-31T23:59:59-04:00")

export function rankingsUpdateNoticeActive(now: Date = new Date()): boolean {
  return now.getTime() <= ENDS
}

export function rankingsUpdateSentence(): string {
  return `The ${RANKINGS_UPDATE.name} update ${RANKINGS_UPDATE.by}, with ${RANKINGS_UPDATE.events} results for the ${RANKINGS_UPDATE.scope}.`
}
