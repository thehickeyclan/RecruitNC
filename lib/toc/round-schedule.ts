/**
 * The round-by-round running order, for spectators.
 *
 * Distinct from {@link import("./constants").TOC_SCHEDULE}, which is the logistics timeline —
 * doors, weigh-in, the opening ceremony. A family wants to know when their wrestler is on, and
 * that is a bracket question: when do the semifinals go, when are the finals.
 *
 * Times come from the crew run sheet at /run-sheet so the two cannot drift. That sheet is planned
 * in two scenarios; this is the eleven-weight one, matching the "all eleven championship finals"
 * copy used everywhere else.
 */

export type RoundKind = "championship" | "consolation" | "finals" | "ceremony"

export type ScheduledRound = {
  time: string
  label: string
  kind: RoundKind
  /** Bracket shorthand, shown small on the right — R1, C1. Ceremonies have none. */
  tag?: string
  /** One line for anyone who does not follow bracket names. */
  detail?: string
}

export const ROUND_KIND_LABEL: Record<RoundKind, string> = {
  championship: "Championship",
  consolation: "Consolation",
  finals: "Finals",
  ceremony: "Ceremony",
}

export const FRIDAY_ROUNDS: readonly ScheduledRound[] = [
  { time: "4:00 – 5:00 PM", label: "Weigh-in & skin check", kind: "ceremony", detail: "One weigh-in for the weekend. Flat weight, no allowance." },
  { time: "5:30 PM", label: "Opening ceremony", kind: "ceremony", detail: "Athlete walkout, welcome, prayer and the national anthem." },
  { time: "6:00 PM", label: "133 lbs pigtail", kind: "championship", tag: "PG", detail: "The one weight with nine wrestlers." },
  { time: "6:00 PM", label: "Round 1", kind: "championship", tag: "R1", detail: "Every weight, two mats. Four bouts per weight." },
  { time: "~9:00 PM", label: "Session ends", kind: "ceremony" },
]

export const SATURDAY_ROUNDS: readonly ScheduledRound[] = [
  { time: "9:30 AM", label: "Consolation 1st Round", kind: "consolation", tag: "C1", detail: "Friday's first-round losers. Two mats." },
  { time: "10:45 AM", label: "Championship Semifinals", kind: "championship", tag: "R2", detail: "Two mats." },
  { time: "12:00 PM", label: "Consolation Semifinals", kind: "consolation", tag: "C2", detail: "Starts once the semifinals finish — it needs their losers." },
  { time: "1:15 PM", label: "Third Place", kind: "consolation", tag: "C3", detail: "One per weight. TOC places the top three." },
  { time: "2:15 PM", label: "The Giving Hour", kind: "ceremony", detail: "Vendor raffle, the Caden Perry Warrior Scholarship and our guest speaker." },
  { time: "3:15 PM", label: "Parade of Finalists", kind: "ceremony", detail: "All finalists walk out together, then the national anthem." },
  { time: "3:45 PM", label: "Championship Finals", kind: "finals", tag: "F", detail: "One mat, all eleven weights, awards after each." },
  { time: "6:15 PM", label: "Most Outstanding Wrestler & Match of Champions", kind: "finals", detail: "Presented last." },
]
