import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isCollegeCoachRole } from "@/lib/coach-auto-approve"
import { buildSchoolIndex, matchSchool } from "@/lib/college-programs/match"
import data from "@/lib/college-programs/programs-2026-27.json"
import type { CollegeMapResponse, CollegeMapSchool } from "@/lib/college-programs/types"

/**
 * The national college map: 437 schools from the 2026-27 program list (compiled 9 Oct 2026,
 * every program confirmed active for the season), plus which of them have a coach on RecruitNC.
 *
 * The list is a file, not a table, until staff data and program pages need one. Replacing the
 * season means replacing programs-2026-27.json.
 */
const SCHOOLS = data.schools as CollegeMapSchool[]

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

  const index = buildSchoolIndex(SCHOOLS)
  const matched = new Set<string>()
  for (const row of rows ?? []) {
    const id = matchSchool(index, String(row.name ?? ""))
    if (id) matched.add(id)
  }
  return matched
}

export async function loadCollegeMap(admin: SupabaseClient, full: boolean): Promise<CollegeMapResponse> {
  if (!full) {
    return { season: "2026-27", access: "preview", schools: SCHOOLS }
  }
  const onRecruitNC = await schoolsWithApprovedCoaches(admin)
  return {
    season: "2026-27",
    access: "full",
    schools: SCHOOLS.map((school) => ({ ...school, onRecruitNC: onRecruitNC.has(school.id) })),
  }
}
