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
  { name: "Luke Padgett", weightClass: "190" },
  { name: "Gavin Lopez", weightClass: "220" },
  { name: "Keyshon Morrison", weightClass: "HWT" },
]

export const NHSCA_DUALS_SELECT_ROSTER: NhscaDualsRosterSeed[] = [
  { name: "Kristopher Kerr Jr.", weightClass: "106" },
  { name: "Xavier Bernthal", weightClass: "113" },
  { name: "Adam Walker", weightClass: "120" },
  { name: "Danny McDermott", weightClass: "120" },
  { name: "Holt Quincy", weightClass: "126" },
  { name: "Shane Shuster", weightClass: "132" },
  { name: "Cole Shuster", weightClass: "138" },
  { name: "Jack Kancler", weightClass: "144" },
  { name: "Jacob Perry", weightClass: "152" },
  { name: "Fares Alkurdasi", weightClass: "160" },
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

export const NHSCA_DUALS_NATIONAL_POOL = 6
export const NHSCA_DUALS_SELECT_POOL = 26

/** Day 1 schedule is seeded from the arrays above. Day 2+ is added in code (not admin UI). */
export const NHSCA_DUALS_DAY_1_NAME = "Day 1"
