/**
 * Private and prep programs that recruit nationally, and the state each one sits in.
 *
 * Why this file exists: every state's profiles are minted from `state_tournament_placers`, which
 * is that state's own association results. Blair Academy and Wyoming Seminary do not wrestle in
 * NJSIAA or PIAA at all, and Lake Highland Prep is absent from our FHSAA capture - so no mint path
 * has ever reached them. On 5 Nov 2026 we held 2,979 National Preps bout sides covering 603
 * wrestlers and had profiles for 13 of them. Our own wrestlers' results already name these kids as
 * opponents, with no page behind the name.
 *
 * The rule, from Matt: a school is accounted for in the state it is LOCATED, never where its
 * athletes happen to live. Lake Highland is Florida, Blair is New Jersey, Wyoming Seminary is
 * Pennsylvania, whoever is on the roster.
 *
 * Two separate facts, kept separate on his instruction, because conflating them mislabels schools:
 *   nationalPreps - competes at the National Prep Championships
 *   nationalProgram - recruits and ranks nationally, but is not a National Prep team
 * Faith Christian and St. Edward are the type cases: elite, and not National Prep entrants.
 */

export type PrepSchool = {
  /** As it is written in results; matching folds case, punctuation and "School"/"Academy". */
  name: string
  state: string
  /** Competes at the National Prep Championships. */
  nationalPreps?: boolean
  /** Recruits and ranks nationally without being a National Prep team. */
  nationalProgram?: boolean
}

export const PREP_SCHOOLS: PrepSchool[] = [
  // Tier 1 - the programs that define national prep wrestling.
  { name: "Blair Academy", state: "NJ", nationalPreps: true, nationalProgram: true },
  { name: "Wyoming Seminary", state: "PA", nationalPreps: true, nationalProgram: true },
  { name: "Lake Highland Prep", state: "FL", nationalPreps: true, nationalProgram: true },
  { name: "Malvern Preparatory School", state: "PA", nationalPreps: true, nationalProgram: true },
  { name: "St. Edward High School", state: "OH", nationalProgram: true },
  { name: "Faith Christian Academy", state: "PA", nationalProgram: true },
  { name: "Bishop McCort Catholic High School", state: "PA", nationalProgram: true },
  { name: "Delbarton School", state: "NJ", nationalProgram: true },
  { name: "St. Joseph Regional High School", state: "NJ", nationalProgram: true },
  { name: "Bergen Catholic High School", state: "NJ", nationalProgram: true },

  // The rest of the 2026 National Prep Championships top 20.
  { name: "Greens Farms Academy", state: "CT", nationalPreps: true },
  { name: "Baylor School", state: "TN", nationalPreps: true },
  { name: "Northfield Mount Hermon", state: "MA", nationalPreps: true },
  { name: "New York Military Academy", state: "NY", nationalPreps: true },
  { name: "McCallie School", state: "TN", nationalPreps: true },
  { name: "Archbishop Spalding", state: "MD", nationalPreps: true },
  { name: "Germantown Academy", state: "PA", nationalPreps: true },
  { name: "Paul VI Catholic", state: "VA", nationalPreps: true },
  { name: "Mount Saint Joseph", state: "MD", nationalPreps: true },
  { name: "Belmont Hill School", state: "MA", nationalPreps: true },
  { name: "The Hill School", state: "PA", nationalPreps: true },
  { name: "Bullis School", state: "MD", nationalPreps: true },
  { name: "Benedictine College Preparatory", state: "VA", nationalPreps: true },
  { name: "McDonogh School", state: "MD", nationalPreps: true },
  { name: "Loyola Blakefield", state: "MD", nationalPreps: true },
  { name: "St. Christopher's School", state: "VA", nationalPreps: true },

  // Nationally competitive private and academy programs outside National Preps.
  { name: "St. John Bosco", state: "CA", nationalProgram: true },
  { name: "Valiant Prep", state: "AZ", nationalProgram: true },
  { name: "Christian Brothers Academy", state: "NJ", nationalProgram: true },
  { name: "St. Peter's Prep", state: "NJ", nationalProgram: true },
  { name: "Bishop McDevitt", state: "PA", nationalProgram: true },
  { name: "Marmion Academy", state: "IL", nationalProgram: true },
  { name: "Detroit Catholic Central", state: "MI", nationalProgram: true },
  { name: "Montini Catholic", state: "IL", nationalProgram: true },
  { name: "Camden Catholic", state: "NJ", nationalProgram: true },
  { name: "Creighton Prep", state: "NE", nationalProgram: true },
  { name: "SLAM! Academy", state: "NV", nationalProgram: true },
]

/** Words that carry no identifying signal, so they never decide a match on their own. */
const STOP = new Set([
  "school", "academy", "high", "hs", "the", "of", "preparatory", "prep", "catholic", "christian",
  "regional", "college", "military",
])

/** Abbreviations results use interchangeably with the full word. */
const EXPAND: Record<string, string> = { mt: "mount", st: "saint", st_: "saint", jr: "junior", sr: "senior" }

const words = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .map((w) => EXPAND[w] ?? w)
    .filter((w) => w && !STOP.has(w))

/**
 * A state written into the school string itself - "St Johns (TX)", "St. Paul's School (NH)".
 * Results carry it when the name alone would be ambiguous, which is exactly when we need it.
 */
export function stateInSchoolName(schoolText: unknown): string | null {
  const m = String(schoolText ?? "").match(/\(([A-Z]{2})\)\s*$/)
  return m ? m[1]! : null
}

/**
 * The prep school a results string names, or null.
 *
 * Results spell these many ways - "Lake Highland Prep", "Lake Highland Preparatory School",
 * "Malvern", "St Johns (TX)" - so the test is that every distinctive word of the shorter name
 * appears in the other. "Mount Saint Joseph" matches "Mount Saint Joseph" and not "St. Joseph
 * Regional", because "regional" and "mount" are not shared.
 */
export function prepSchoolFor(schoolText: unknown): PrepSchool | null {
  const got = words(schoolText)
  if (!got.length) return null
  let best: PrepSchool | null = null
  let bestScore = 0
  for (const s of PREP_SCHOOLS) {
    const want = words(s.name)
    if (!want.length) continue
    const [short, long] = want.length <= got.length ? [want, got] : [got, want]
    if (!short.every((w) => long.includes(w))) continue
    if (short.length > bestScore) {
      best = s
      bestScore = short.length
    }
  }
  return best
}

/** Every state that holds at least one program here. */
export function prepStates(): string[] {
  return [...new Set(PREP_SCHOOLS.map((s) => s.state))].sort()
}
