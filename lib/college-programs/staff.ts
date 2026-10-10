/**
 * College wrestling coaching staff, 2026-27: 2,199 rows taken from each school's live athletics
 * site on 9-10 Oct 2026. A coach on both the men's and women's staff is one entry with two teams.
 *
 * 25 programs have no staff here because their site could not be read; an empty list means
 * "not captured", never "no coaches".
 */

import data from "@/lib/college-programs/staff-2026-27.json"
import type { CollegeDivision } from "@/lib/college-programs/types"

export type CollegeStaffMember = {
  name: string
  title: string
  division: CollegeDivision
  teams: Array<"mens" | "womens">
  /** Only as published on the school's own site. */
  email: string | null
  source: string | null
}

const STAFF = data.staff as Record<string, CollegeStaffMember[]>

/** Head coaches first, then associates, assistants, volunteers and students, then support staff. */
export function roleRank(title: string): number {
  const t = title.toLowerCase()
  if (/trainer|operations|manager|strength|director of wrestling operations/.test(t)) return 5
  if (/volunteer|graduate|student/.test(t)) return 4
  if (/associate head/.test(t)) return 1
  if (/director of wrestling|head/.test(t) && !/assistant/.test(t)) return 0
  if (/head assistant/.test(t)) return 2
  return 3
}

export function isHeadCoach(member: Pick<CollegeStaffMember, "title">): boolean {
  return roleRank(member.title) === 0
}

export function staffForSchool(schoolId: string): CollegeStaffMember[] {
  return [...(STAFF[schoolId] ?? [])].sort((a, b) => roleRank(a.title) - roleRank(b.title))
}

/** Every school a coach of this name is on staff at. Exact on the name, case-insensitive. */
export function schoolsForCoach(name: string): Array<{ schoolId: string; member: CollegeStaffMember }> {
  const wanted = name.trim().toLowerCase()
  if (!wanted) return []
  const hits: Array<{ schoolId: string; member: CollegeStaffMember }> = []
  for (const [schoolId, members] of Object.entries(STAFF)) {
    for (const member of members) if (member.name.toLowerCase() === wanted) hits.push({ schoolId, member })
  }
  return hits
}

export const STAFF_SOURCE = data.source
