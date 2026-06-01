/** Verified chart + award data for Class of 2026 male commits (total = 49). */

export const RECRUITING_AWARDS_SLUG = "nc-united-recruiting-awards-2026"

export const COMMITS_BY_COLLEGE_TOP = [
  { college: "UNC Pembroke", commits: 7, highlight: true },
  { college: "Lynchburg", commits: 6, highlight: false },
  { college: "Roanoke", commits: 3, highlight: false },
  { college: "Mount Olive", commits: 3, highlight: false },
  { college: "Greensboro", commits: 3, highlight: false },
  { college: "Shenandoah", commits: 2, highlight: false },
  { college: "Ferrum", commits: 2, highlight: false },
  { college: "Davidson", commits: 2, highlight: false },
  { college: "The Citadel", commits: 2, highlight: false },
  { college: "Appalachian State", commits: 2, highlight: false },
] as const

export const COMMITS_BY_COLLEGE_OTHER = {
  college: "Other programs (1 each)",
  commits: 17,
  highlight: false,
} as const

export const COMMITS_BY_DIVISION = [
  { division: "D3", commits: 17 },
  { division: "D2", commits: 15 },
  { division: "D1", commits: 12 },
  { division: "NJCAA", commits: 3 },
  { division: "NAIA", commits: 1 },
  { division: "Club", commits: 1 },
] as const

export type RecruitingAwardsFeaturedAthlete = {
  name: string
  school: string
  rank: number
}

export const AWARD_WINNERS = [
  {
    award: "Top Haul",
    college: "UNC Pembroke",
    stat: "7 commits",
    featuredAthletes: [
      { name: "Imon Freeman", school: "Montgomery Central", rank: 11 },
      { name: "Gavin Yow", school: "A.L. Brown", rank: 13 },
    ],
  },
  {
    award: "Best Top-End Class",
    college: "Appalachian State",
    stat: "2 D1 commits",
    featuredAthletes: [
      { name: "Bentley Sly", school: "Stuart Cramer", rank: 1 },
      { name: "Avery Rhymer", school: "St. Stephens", rank: 12 },
    ],
  },
  {
    award: "Best Value Find",
    college: "Lynchburg",
    stat: "6 commits",
    featuredAthletes: [
      { name: "Jacob Reigel", school: "Mount Pleasant", rank: 15 },
      { name: "Cameron Gue", school: "Mount Pleasant", rank: 29 },
    ],
  },
  {
    award: "Emerging Pipeline",
    college: "The Citadel",
    stat: "2 D1 commits",
    featuredAthletes: [
      { name: "Andrew Meadows", school: "Mount Airy", rank: 6 },
      { name: "Dominic Hittepole", school: "Wheatmore", rank: 22 },
    ],
  },
] as const satisfies ReadonlyArray<{
  award: string
  college: string
  stat: string
  featuredAthletes: readonly RecruitingAwardsFeaturedAthlete[]
}>

/** Names to try against logo_mappings + /public fallbacks (order matters). */
export const AWARD_COLLEGE_LOGO_LOOKUP: Record<string, readonly string[]> = {
  "UNC Pembroke": ["UNC Pembroke", "University of North Carolina at Pembroke", "UNCP"],
  "Appalachian State": ["Appalachian State", "App State", "Appalachian State University"],
  Lynchburg: ["Lynchburg", "Lynchburg University", "University of Lynchburg"],
  "The Citadel": ["Citadel", "The Citadel", "Citadel Military College of South Carolina"],
}

/**
 * News index + homepage carousel + article hero banner.
 */
export const RECRUITING_AWARDS_CARD_IMAGE = "/images/recruiting-awards-2026/hero.png"

export const IMAGE_PATHS = {
  hero: RECRUITING_AWARDS_CARD_IMAGE,
  uncpProgram: "/images/recruiting-awards-2026/unc-pembroke-wrestling.png",
  appStateProgram: "/images/recruiting-awards-2026/app-state-wrestling.png",
  bentleySly: "/images/recruiting-awards-2026/bentley-sly.png",
  andrewMeadows: "/images/recruiting-awards-2026/andrew-meadows.png",
  citadelProgram: "/images/recruiting-awards-2026/citadel-wrestling.png",
  lynchburgProgram: "/images/recruiting-awards-2026/lynchburg-wrestling.png",
} as const
