import type { CollegeMapSchool } from "@/lib/college-programs/types"

/**
 * Programs that have been announced and are recruiting, but do not wrestle until a later season.
 *
 * They are on the map and nowhere else. programs-2026-27.json is the list of programs competing
 * this season and is what the counts and Data Dawg's answers are built from ("436 schools have
 * college wrestling in 2026-27"); a school whose first dual is next year would make that false.
 * But its coach is on RecruitNC recruiting now, and a family looking at the map should find it.
 * The card says when it starts. Move an entry into the season file when its first season comes.
 */
export const ANNOUNCED_PROGRAMS: CollegeMapSchool[] = [
  {
    // Head coach Jeff Breese hired July 2026 (rockathletics.com staff directory); Matt, 12 October 2026.
    id: "slippery-rock-university",
    name: "Slippery Rock University",
    city: "Slippery Rock",
    state: "PA",
    latitude: 41.0634,
    longitude: -80.0431,
    website: "https://rockathletics.com",
    programs: [{ division: "NCAA Division II", mens: true, womens: false, conference: null }],
    firstSeason: "2027-28",
  },
]
