/**
 * A wrestler who did not show up where the class did.
 *
 * The board already records `last_competed` and deliberately does not score it: wrestling is
 * seasonal, so in September everybody's most recent result is February states, and a flat
 * recency penalty would punish a whole class for the calendar.
 *
 * That reasoning is right about the calendar and wrong about the event. When thirty-four of the
 * Class of 2027 wrestled the Tournament of Champions in September and one did not, the absence
 * is information — not about the month, but about that wrestler's September. It cost Mac
 * Johnson nothing to be missing from the deepest field of the year.
 *
 * So the penalty is relative, never absolute: it applies only to an event a meaningful share of
 * the class entered, and it scales with how many of them did. Nobody is penalised in July,
 * because in July nobody is wrestling.
 *
 * It is a lighter touch than a result. A TOC title is worth +52; missing the TOC costs at most
 * 30, and only when nearly the whole class was there. An absence is weaker evidence than a
 * performance and is scored that way — a wrestler may be injured, and the panel says so rather
 * than implying they ducked it.
 */

/**
 * An event has to draw this share of the class before missing it means anything.
 *
 * Set at a quarter first, and that was too loose: Super 32 Early Entry drew 25 of the 92 in the
 * Class of 2027 — 27% — which cleared the bar and charged 88 of 92 wrestlers for skipping a
 * regional qualifier. A penalty almost everybody pays is not evidence, it is noise.
 *
 * At two fifths only the Tournament of Champions qualifies (45 of 92), which is the case this
 * was built for: the event where a class actually assembles.
 */
export const WINDOW_PARTICIPATION_FLOOR = 0.4

/** The most a single missed window can cost, when effectively the whole class was there. */
export const MAX_WINDOW_PENALTY = 30

export type ClassWindow = {
  /** "Tournament of Champions 2026" */
  label: string
  year: number
  entrants: number
  classSize: number
  /** 0-1. */
  participation: number
}

/** Events the class turned out for, newest first. Only the seasons given are considered. */
export function findClassWindows(
  entriesByAthlete: ReadonlyMap<string, ReadonlySet<string>>,
  options: { classSize: number; seasons: number[] },
): ClassWindow[] {
  const counts = new Map<string, number>()
  for (const [, entries] of entriesByAthlete) {
    for (const key of entries) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const windows: ClassWindow[] = []
  for (const [label, entrants] of counts) {
    const year = Number(String(label).match(/\b(20\d{2})\b/)?.[1] ?? 0)
    if (!options.seasons.includes(year)) continue
    const participation = options.classSize > 0 ? entrants / options.classSize : 0
    if (participation < WINDOW_PARTICIPATION_FLOOR) continue
    windows.push({ label, year, entrants, classSize: options.classSize, participation })
  }
  return windows.sort((a, b) => b.year - a.year || b.entrants - a.entrants)
}

export type MissedWindow = ClassWindow & { penalty: number }

/** What this wrestler missed, and what it costs. */
export function missedWindowsFor(
  entered: ReadonlySet<string>,
  windows: readonly ClassWindow[],
): MissedWindow[] {
  return windows
    .filter((w) => !entered.has(w.label))
    .map((w) => ({ ...w, penalty: Math.round(MAX_WINDOW_PENALTY * w.participation) }))
    .filter((w) => w.penalty > 0)
}

/** "34 of 92 in the class wrestled it" — the sentence a reviewer needs to judge the penalty. */
export function describeMissedWindow(missed: MissedWindow): string {
  return `Did not enter ${missed.label} — ${missed.entrants} of ${missed.classSize} in the class did`
}
