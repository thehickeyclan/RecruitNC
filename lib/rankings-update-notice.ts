/**
 * "New rankings by Friday" (Matt, 26 Oct 2026): the next North Carolina rankings, with results from
 * Journeymen, I-64 and Super 32, are promised by Friday 30 October. Shown on the Super 32 recap, the
 * coach reports and the coach email. Ends the night of the 31st: a promise past its date reads as a
 * missed one (the event-clock rule).
 */
export const RANKINGS_UPDATE = {
  by: "Friday, October 30",
  events: "Journeymen, I-64 and Super 32",
}
const ENDS = Date.parse("2026-10-31T23:59:59-04:00")

export function rankingsUpdateNoticeActive(now: Date = new Date()): boolean {
  return now.getTime() <= ENDS
}

export function rankingsUpdateSentence(): string {
  return `New North Carolina rankings come out by ${RANKINGS_UPDATE.by}, updated with results from ${RANKINGS_UPDATE.events}.`
}
