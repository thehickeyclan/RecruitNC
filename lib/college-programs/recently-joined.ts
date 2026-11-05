import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isCollegeCoachRole } from "@/lib/coach-auto-approve"
import { mapSchoolIdFor } from "@/lib/college-programs/load"
import data from "@/lib/college-programs/programs-2026-27.json"
import { DIVISION_SHORT, primaryDivision, type CollegeMapSchool } from "@/lib/college-programs/types"

/**
 * College programs that joined in the last 30 days, for the family's Command Center (Matt, 5 Nov
 * 2026): a program "joins" the day its first approved coach did, so a second coach from a school
 * already here is not news. Each links to the college's own page.
 */
export type RecentlyJoinedProgram = { id: string; name: string; place: string; level: string; joinedAt: string }

const SCHOOLS = (data as { schools: CollegeMapSchool[] }).schools
const BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]))
const INTERNAL_EMAIL = /ncwrestlingunited|thehickeyclan|testcoach|@example\.com$/i
const WINDOW_DAYS = 30

export async function loadRecentlyJoined(admin: SupabaseClient, gender: string | null, limit = 6): Promise<RecentlyJoinedProgram[]> {
  const { data: coaches, error } = await admin
    .from("user_profiles")
    .select("role, email, is_admin, verification_status, verified_at, created_at, school_id")
    .eq("verified_coach", true)
    .not("school_id", "is", null)
  if (error || !coaches?.length) return []
  const approved = coaches.filter(
    (c) => isCollegeCoachRole(c.role) && String(c.verification_status ?? "").toLowerCase() === "approved" && c.is_admin !== true && !INTERNAL_EMAIL.test(String(c.email ?? "")),
  )
  const { data: rows } = await admin.from("schools").select("id, name").in("id", [...new Set(approved.map((c) => String(c.school_id)))])
  const mapId = new Map((rows ?? []).map((r) => [String(r.id), mapSchoolIdFor(String(r.name ?? ""))]))

  // The earliest approved coach per program, across all time: that day is when the program joined.
  const first = new Map<string, string>()
  for (const c of approved) {
    const id = mapId.get(String(c.school_id))
    const when = String(c.verified_at ?? c.created_at ?? "")
    if (!id || !when) continue
    if (!first.has(id) || when < first.get(id)!) first.set(id, when)
  }
  const since = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString()
  // A girl's family is shown programs with a women's team, a boy's family a men's team.
  const girls = /^f/i.test(String(gender ?? ""))
  return [...first]
    .filter(([, when]) => when >= since)
    .map(([id, joinedAt]) => ({ school: BY_ID.get(id), joinedAt }))
    .filter((r): r is { school: CollegeMapSchool; joinedAt: string } => Boolean(r.school))
    .filter(({ school }) => !gender || school.programs.some((p) => (girls ? p.womens : p.mens)))
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
    .slice(0, limit)
    .map(({ school, joinedAt }) => ({
      id: school.id,
      name: school.name,
      place: [school.city, school.state].filter(Boolean).join(", "),
      level: DIVISION_SHORT[primaryDivision(school)],
      joinedAt,
    }))
}
