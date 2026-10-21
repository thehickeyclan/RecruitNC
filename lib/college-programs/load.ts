import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isCollegeCoachRole } from "@/lib/coach-auto-approve"
import { buildSchoolIndex, matchSchool } from "@/lib/college-programs/match"
import data from "@/lib/college-programs/programs-2026-27.json"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { rosterForSchool } from "@/lib/college-programs/rosters"
import type { CollegeMapResponse, CollegeMapSchool } from "@/lib/college-programs/types"

/**
 * The national college map: the schools on the 2026-27 program list (compiled 9 Oct 2026, every
 * program confirmed active for the season), the few announced for a later season whose coaches
 * are already recruiting (announced.ts), and which of them all have a coach on RecruitNC.
 *
 * The list is a file, not a table, until staff data and program pages need one. Replacing the
 * season means replacing programs-2026-27.json.
 */
const SCHOOLS = [...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS]

const SCHOOL_INDEX = buildSchoolIndex(SCHOOLS)

/** The map dot a coach's school name lands on, or null when the map has no such school. */
export function mapSchoolIdFor(coachSchoolName: string): string | null {
  return matchSchool(SCHOOL_INDEX, coachSchoolName)
}

/**
 * Schools with at least one coach Matt has confirmed - the same bar as messaging
 * (lib/coach-messages isApprovedCoach), so a dot marked On RecruitNC is a school whose coach
 * can actually see the profile and write to the family.
 */
async function schoolsWithApprovedCoaches(admin: SupabaseClient): Promise<Set<string>> {
  const { data: coaches, error } = await admin
    .from("user_profiles")
    .select("role, verified_coach, verification_status, school_id")
    .eq("verified_coach", true)
    .not("school_id", "is", null)
  if (error) throw new Error(`college map: coach lookup failed: ${error.message}`)

  const schoolIds = [
    ...new Set(
      (coaches ?? [])
        .filter(
          (c) => isCollegeCoachRole(c.role) && String(c.verification_status ?? "").toLowerCase() === "approved",
        )
        .map((c) => String(c.school_id)),
    ),
  ]
  if (schoolIds.length === 0) return new Set()

  const { data: rows, error: schoolError } = await admin.from("schools").select("id, name").in("id", schoolIds)
  if (schoolError) throw new Error(`college map: school lookup failed: ${schoolError.message}`)

  const matched = new Set<string>()
  for (const row of rows ?? []) {
    const id = mapSchoolIdFor(String(row.name ?? ""))
    if (id) matched.add(id)
  }
  return matched
}

const INTERNAL_EMAIL = /ncwrestlingunited|thehickeyclan|testcoach|@example\.com$/i

/**
 * The numbers on the map's share image: approved coaches (staff and test accounts left out),
 * the map schools they coach at, and how many states those schools are in.
 */
export async function recruitNCMapStats(admin: SupabaseClient): Promise<{
  coaches: number
  schools: CollegeMapSchool[]
  onRecruitNC: CollegeMapSchool[]
  states: number
}> {
  const [onRecruitNC, { data, error }] = await Promise.all([
    schoolsWithApprovedCoaches(admin),
    admin
      .from("user_profiles")
      .select("role, email, is_admin, verified_coach, verification_status")
      .eq("verified_coach", true),
  ])
  if (error) throw new Error(`college map: coach count failed: ${error.message}`)
  const coaches = (data ?? []).filter(
    (c) =>
      isCollegeCoachRole(c.role) &&
      String(c.verification_status ?? "").toLowerCase() === "approved" &&
      c.is_admin !== true &&
      !INTERNAL_EMAIL.test(String(c.email ?? "")),
  ).length
  const on = SCHOOLS.filter((school) => onRecruitNC.has(school.id))
  return { coaches, schools: SCHOOLS, onRecruitNC: on, states: new Set(on.map((school) => school.state)).size }
}

/**
 * Which programs are On RecruitNC is public: it is what the map is shared for (Matt, 18 Oct 2026).
 * The other filters, staff and My List stay with full access.
 */
export async function loadCollegeMap(admin: SupabaseClient, full: boolean): Promise<CollegeMapResponse> {
  const onRecruitNC = await schoolsWithApprovedCoaches(admin)
  return {
    season: "2026-27",
    access: full ? "full" : "preview",
    schools: SCHOOLS.map((school) => {
      // Published roster names, so they are shown to every viewer, like the roster on the school's own site.
      const wrestlers = rosterForSchool(school.id).wrestlers
      return { ...school, onRecruitNC: onRecruitNC.has(school.id), ...(wrestlers.length ? { fromState: { state: "NC", wrestlers } } : {}) }
    }),
  }
}

export type CollegePickerOption = {
  id: string
  /** What the coach reads and searches: the map's formal name. */
  name: string
  /**
   * What is saved. The name we already hold for this school when a coach from it has signed up
   * before, so the new coach lands on the same school record; otherwise the map's own name.
   */
  value: string
  place: string | null
  division: string | null
}

/**
 * The colleges a coach can pick at sign-up: every school on the map, then anything already on
 * file that the map does not have (a club program such as Liberty).
 */
export async function loadCollegePickerOptions(admin: SupabaseClient): Promise<CollegePickerOption[]> {
  const { data: onFile } = await admin.from("colleges").select("id, name, division")
  const heldNameByMapId = new Map<string, string>()
  const offMap: CollegePickerOption[] = []
  for (const college of onFile ?? []) {
    const name = String(college.name ?? "").trim()
    // A leftover test row in `colleges`; it should be deleted, and must not be offered meanwhile.
    if (!name || /college name here/i.test(name)) continue
    const mapId = mapSchoolIdFor(name)
    if (mapId) {
      if (!heldNameByMapId.has(mapId)) heldNameByMapId.set(mapId, name)
    } else {
      offMap.push({ id: `college-${college.id}`, name, value: name, place: null, division: (college.division as string | null) || null })
    }
  }
  const onMap = SCHOOLS.map((school) => ({
    id: school.id,
    name: school.name,
    value: heldNameByMapId.get(school.id) ?? school.name,
    place: [school.city, school.state].filter(Boolean).join(", ") || null,
    division: school.programs?.[0]?.division ?? null,
  }))
  return [...onMap, ...offMap].sort((a, b) => a.name.localeCompare(b.name))
}
