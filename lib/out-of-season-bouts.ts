/**
 * Telling an out-of-season bout from an in-season one.
 *
 * The in-season match log is a record of a wrestler's high school season. Spring and summer events
 * are a different thing: they are open, often freestyle, and a loss there does not belong in a
 * varsity record. Nineteen Interstate 64 Spring Duals bouts had been imported into the log.
 *
 * Matching on the event rather than the date, deliberately. A date rule looked tempting — the only
 * March bouts in the table were I64 — but five of them were Abdeen Zaggout at the NYSPHSAA state
 * championships, which is New York's in-season championship and runs into March. Excluding a state
 * title run to catch a spring dual would be the worse error.
 *
 * These bouts are still read for significant wins and for TOC seeding, where beating a ranked
 * opponent counts wherever it happened. Only the season log leaves them out.
 */

const OUT_OF_SEASON_EVENT = [
  /interstate\s*64/i,
  /\bi-?64\b/i,
  /spring\s*duals?/i,
  /summer\s*duals?/i,
  /\bspring\s*(open|classic|nationals?)\b/i,
]

/** Anything the event name says happened outside the high school season. */
export function isOutOfSeasonBout(bout: unknown): boolean {
  if (!bout || typeof bout !== "object") return false
  const row = bout as Record<string, unknown>
  const label = [row.venue, row.event, row.tournament, row.meet]
    .map((value) => (typeof value === "string" ? value : ""))
    .join(" ")
  if (!label.trim()) return false
  return OUT_OF_SEASON_EVENT.some((pattern) => pattern.test(label))
}

/** The season log: everything the wrestler did in season, in order, minus the spring events. */
export function inSeasonBoutsOnly<T>(bouts: readonly T[]): T[] {
  return bouts.filter((bout) => !isOutOfSeasonBout(bout))
}
