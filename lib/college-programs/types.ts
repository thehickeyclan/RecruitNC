export type CollegeDivision = "NCAA Division I" | "NCAA Division II" | "NCAA Division III" | "NAIA" | "NJCAA"

/** Map order, and the order a school's programs are listed in its card. */
export const COLLEGE_DIVISIONS: CollegeDivision[] = [
  "NCAA Division I",
  "NCAA Division II",
  "NCAA Division III",
  "NAIA",
  "NJCAA",
]

export const DIVISION_SHORT: Record<CollegeDivision, string> = {
  "NCAA Division I": "D1",
  "NCAA Division II": "D2",
  "NCAA Division III": "D3",
  NAIA: "NAIA",
  NJCAA: "NJCAA",
}

export type CollegeProgram = {
  division: CollegeDivision
  mens: boolean
  womens: boolean
  conference: string | null
}

/**
 * One dot on the map. A school is one place, so it is one dot even when its men's and women's
 * teams wrestle in different divisions (Lock Haven and Edinboro: men D1, women D2).
 */
export type CollegeMapSchool = {
  id: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
  website: string | null
  programs: CollegeProgram[]
  /** Present only for viewers with full access; a school with an approved coach on RecruitNC. */
  onRecruitNC?: boolean
  /** Set on a program that has been announced but has not wrestled yet, e.g. "2027-28" (announced.ts). */
  firstSeason?: string
  /**
   * Wrestlers on this college's current roster from one state, read from the school's published
   * roster (lib/college-programs/rosters.ts). North Carolina only until the roster pull keeps every
   * hometown; the map's "From North Carolina" filter and dot sizes read it (Matt, 20 Oct 2026).
   */
  fromState?: {
    state: string
    wrestlers: Array<{ name: string; team: "mens" | "womens"; weight: string | null; class: string | null; highSchool: string | null; hometown: string | null }>
  }
}

export type CollegeMapResponse = {
  season: string
  /** Blue members, admins and verified coaches get the filters and the On RecruitNC flag. */
  access: "full" | "preview"
  schools: CollegeMapSchool[]
  /** A family whose wrestlers are all boys or all girls: the map opens on those programs. */
  focus?: { gender: "mens" | "womens"; names: string[] } | null
}

/** The division a dot is coloured by: the highest level any of its programs wrestles at. */
export function primaryDivision(school: Pick<CollegeMapSchool, "programs">): CollegeDivision {
  for (const division of COLLEGE_DIVISIONS) {
    if (school.programs.some((program) => program.division === division)) return division
  }
  return school.programs[0]?.division ?? "NCAA Division III"
}

/** One colour per level, readable on the dark basemap and distinct from each other. */
export const DIVISION_COLOR: Record<CollegeDivision, string> = {
  "NCAA Division I": "#EF4444",
  "NCAA Division II": "#3B82F6",
  "NCAA Division III": "#22C55E",
  NAIA: "#F5B942",
  NJCAA: "#A78BFA",
}
