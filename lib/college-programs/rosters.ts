/**
 * North Carolina wrestlers on each college's current roster.
 *
 * Read off each school's own published roster on 12 Oct 2026: 326 wrestlers at 88 schools, from
 * 544 of the 626 team rosters. A wrestler counts as North Carolina when the roster gives an NC
 * hometown (one, Calan Staub at Mount Olive, on his NC high school alone).
 *
 * 82 rosters could not be read - the site blocked us or publishes no roster page. For those we say
 * so; a school we could not read is never shown as having no NC wrestlers.
 */

import data from "@/lib/college-programs/nc-rosters-2026-27.json"

export type RosterWrestler = {
  name: string
  team: "mens" | "womens"
  weight: string | null
  /** As the roster gives it, tidied: "Fr.", "R-So.", "Gr." */
  class: string | null
  hometown: string | null
  highSchool: string | null
}

export type RosterTeam = {
  team: "mens" | "womens"
  reviewed: boolean
  /** The roster's own stated season; some schools still show last year's. */
  season: string | null
  rosterSize: number | null
  url: string | null
}

type SchoolRoster = { wrestlers: RosterWrestler[]; teams: Array<RosterTeam & { division: string }> }

const ROSTERS = data.schools as Record<string, SchoolRoster>
export const ROSTERS_PULLED = data.pulled

export type SchoolRosterView = {
  wrestlers: RosterWrestler[]
  /** One finished sentence per team: how many of the roster are from NC, or that we could not read it. */
  teamLines: string[]
  /** True when at least one of the school's rosters was read. */
  anyReviewed: boolean
}

const TEAM_WORD = { mens: "men's", womens: "women's" } as const

/**
 * Whether the roster SIZES in the file can be shown.
 *
 * The first pull (12 Oct 2026) counted the coaches and support staff that sit as cards on the
 * same roster page: NC State read 48 for a team of 32. The North Carolina wrestlers themselves
 * were checked and are right; the totals are not, so "7 of the 48" is never said. Turn this on
 * only with a file whose counts are wrestlers only.
 */
const ROSTER_SIZES_VERIFIED = false

export function rosterForSchool(schoolId: string): SchoolRosterView {
  const school = ROSTERS[schoolId] ?? { wrestlers: [], teams: [] }
  const both = new Set(school.teams.map((t) => t.team)).size > 1
  const teamLines = school.teams.map((t) => {
    const team = both ? `${TEAM_WORD[t.team]} ` : ""
    if (!t.reviewed) return `We could not read the ${team}roster on the school's site, so we can't say who on it is from North Carolina.`
    const nc = school.wrestlers.filter((w) => w.team === t.team).length
    const season = t.season ? `${t.season} ` : ""
    if (t.rosterSize == null || !ROSTER_SIZES_VERIFIED) {
      return nc === 0
        ? `No North Carolina wrestlers are on the ${season}${team}roster.`
        : `${nc} North Carolina ${nc === 1 ? "wrestler is" : "wrestlers are"} on the ${season}${team}roster.`
    }
    if (nc === 0) return `None of the ${t.rosterSize} wrestlers on the ${season}${team}roster ${t.rosterSize === 1 ? "is" : "are"} from North Carolina.`
    return `${nc} of the ${t.rosterSize} wrestlers on the ${season}${team}roster ${nc === 1 ? "is" : "are"} from North Carolina.`
  })
  return { wrestlers: school.wrestlers, teamLines, anyReviewed: school.teams.some((t) => t.reviewed) }
}

export { rosterNameKey } from "@/lib/college-programs/roster-name"
