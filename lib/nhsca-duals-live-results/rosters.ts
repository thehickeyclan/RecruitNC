/** Static roster seed data for NHSCA Duals 2026 results (National + Select) */

export type NhscaDualsRosterSeed = {
  name: string
  weightClass: string
}

export const NHSCA_DUALS_NATIONAL_ROSTER: NhscaDualsRosterSeed[] = [
  { name: "Xan Moody", weightClass: "106" },
  { name: "Jaxon Thomas", weightClass: "113" },
  { name: "Jekai Sedgwick", weightClass: "120" },
  { name: "Ayden Sumners", weightClass: "126" },
  { name: "Mac Johnson", weightClass: "132" },
  { name: "Tye Johnson", weightClass: "138" },
  { name: "Sammy Gantt", weightClass: "145" },
  { name: "Aidan Gore", weightClass: "152" },
  { name: "Tobin McNair", weightClass: "160" },
  { name: "Dominic Blue", weightClass: "170" },
  { name: "Brieon Mayfield", weightClass: "182" },
  { name: "Fares Alkurdasi", weightClass: "195" },
  { name: "Luke Padgett", weightClass: "195" },
  { name: "Gavin Lopez", weightClass: "220" },
  { name: "Keyshon Morrison", weightClass: "HWT" },
]

export const NHSCA_DUALS_SELECT_ROSTER: NhscaDualsRosterSeed[] = [
  { name: "Kristopher Kerr Jr.", weightClass: "106" },
  { name: "Xavier Bernthal", weightClass: "113" },
  { name: "Danny McDermott", weightClass: "120" },
  { name: "Holt Quincy", weightClass: "126" },
  { name: "Shane Shuster", weightClass: "132" },
  { name: "Cole Shuster", weightClass: "138" },
  { name: "Jack Kancler", weightClass: "144" },
  { name: "Jacob Perry", weightClass: "152" },
  { name: "Jon Burns", weightClass: "160" },
  { name: "Vincent Valentino", weightClass: "160" },
  { name: "John Bane", weightClass: "170" },
  { name: "Manny Kahsai", weightClass: "183" },
  { name: "Tillman Caskey", weightClass: "190" },
  { name: "Cory Thomas", weightClass: "220" },
  { name: "Mason Hocker", weightClass: "HWT" },
]

export const NHSCA_DUALS_NATIONAL_TEAM_LABEL = "NC United National Team"
export const NHSCA_DUALS_SELECT_TEAM_LABEL = "NC United Select Team"

/** Initial pool matchups per user spec */
export const NHSCA_DUALS_NATIONAL_INITIAL_DUALS = [
  { round: "Round 1", opponent: "TNWC Silver Fox" },
  { round: "Round 2", opponent: "Lucky Duck Wrestling Club" },
  { round: "Round 3", opponent: "Team Gotcha" },
] as const

export const NHSCA_DUALS_SELECT_INITIAL_DUALS = [
  { round: "Round 1", opponent: "Doughboy Black" },
  { round: "Round 2", opponent: "University Hawks Wrestling" },
  { round: "Round 3", opponent: "Buffalo Valley Red" },
] as const

/** Select 160 lbs — two wrestlers split pool duals. Key = opponent_team_name on the dual row. */
export const NHSCA_DUALS_SELECT_160_STARTERS: Readonly<Record<string, string>> = {
  "Doughboy Black": "Vincent Valentino",
  "University Hawks Wrestling": "Jon Burns",
  "Buffalo Valley Red": "Vincent Valentino",
}

/** National 195 lbs — Fares (Day 1) vs Luke Padgett (Day 2). Key = opponent_team_name. */
export const NHSCA_DUALS_NATIONAL_195_STARTERS: Readonly<Record<string, string>> = {
  "TNWC Silver Fox": "Fares Alkurdasi",
  "Lucky Duck Wrestling Club": "Fares Alkurdasi",
  "Team Gotcha": "Fares Alkurdasi",
  "Storm Wrestling Center": "Luke Padgett",
  "Prestige Worldwide": "Luke Padgett",
  "The Shop 814": "Luke Padgett",
}

export const NHSCA_DUALS_NATIONAL_POOL = 6
export const NHSCA_DUALS_SELECT_POOL = 26

/** Day 1 schedule is seeded from the arrays above. Day 2+ is added in code (not admin UI). */
export const NHSCA_DUALS_DAY_1_NAME = "Day 1"
export const NHSCA_DUALS_DAY_2_NAME = "Day 2"

/** National Day 2 — Championship pool (sort_order continues after Day 1). */
export const NHSCA_DUALS_NATIONAL_DAY_2_DUALS = [
  { round: "Round 1", opponent: "Storm Wrestling Center" },
  { round: "Round 2", opponent: "Prestige Worldwide" },
  { round: "Round 3", opponent: "The Shop 814" },
] as const
