/**
 * The Super 32 report promise to college coaches (Matt, 16 October 2026): every wrestler a coach
 * has starred gets a computed report - placement, record, significant wins, notable losses -
 * within 24 hours of the finals. "Did not compete" is stated, never left out.
 *
 * One home for the dates, so every notice of the promise turns itself off when the event is
 * over. A date gate with no end is how the TOC surfaces went on announcing an event the day after
 * it ended (see the event-clock rule): this one has a ceiling.
 */
export const SUPER32_2026 = {
  name: "Super 32",
  /** First day, Eastern. */
  startsOn: "2026-10-24",
  /** Finals day, Eastern. */
  finalsOn: "2026-10-25",
  /** The promise, in hours after the finals. */
  reportWithinHours: 24,
}

/** Midnight Eastern at the end of the finals day: the notices stop here. */
const NOTICE_ENDS = Date.parse(`${SUPER32_2026.finalsOn}T23:59:59-04:00`)

/** Whether coaches should be told about the report: from now until the finals are over. */
export function super32NoticeActive(now: Date = new Date()): boolean {
  return now.getTime() <= NOTICE_ENDS
}

/** "Oct 24–25", for the notices. */
export function super32Dates(): string {
  const day = (iso: string) => Number(iso.slice(8, 10))
  return `Oct ${day(SUPER32_2026.startsOn)}–${day(SUPER32_2026.finalsOn)}`
}

/** The one sentence every surface uses, so the promise reads the same everywhere. */
export function super32ReportPromise(): string {
  return `Every wrestler you star gets a ${SUPER32_2026.name} report (placement, record, significant wins and notable losses) within ${SUPER32_2026.reportWithinHours} hours of the finals.`
}
