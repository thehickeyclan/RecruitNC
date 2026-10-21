import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { familyAthleteIds } from "@/lib/coach-messages"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"

/**
 * "We're interested in your program" (Matt, 21 Oct 2026): a family tells one college's coaches,
 * by choice and college by college. Saving a college to the list stays private; this is the only
 * thing a program sees. Free for every family: each tap is a warm lead on a coach's dashboard.
 */

const TABLE = "college_interest"
/** Postgres "relation does not exist": the SQL has not been run yet. */
const TABLE_MISSING = "42P01"

export type FamilyWrestler = { id: string; firstName: string }

/** The family's wrestlers still in high school: the ones a program can be told about. */
export async function familyWrestlers(admin: SupabaseClient, userId: string): Promise<FamilyWrestler[]> {
  const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
  if (!ids.length) return []
  const { data } = await admin.from("athletes").select('id, name, "firstName", graduationyear').in("id", ids)
  const graduated = mostRecentGraduatedClassYear()
  return (data ?? [])
    .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    .sort((a, b) => Number(a.graduationyear ?? 9999) - Number(b.graduationyear ?? 9999))
    .map((a) => ({ id: String(a.id), firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").split(" ")[0] || "Your wrestler" }))
}

/** Which of these wrestlers have told which colleges. `available: false` until the SQL is run. */
export async function interestSent(admin: SupabaseClient, athleteIds: string[]): Promise<{ available: boolean; sent: Array<{ athleteId: string; schoolId: string }> }> {
  if (!athleteIds.length) return { available: true, sent: [] }
  const { data, error } = await admin.from(TABLE).select("athlete_id, school_id").in("athlete_id", athleteIds)
  if (error) return { available: error.code !== TABLE_MISSING, sent: [] }
  return { available: true, sent: (data ?? []).map((r) => ({ athleteId: String(r.athlete_id), schoolId: String(r.school_id) })) }
}

export async function setInterest(admin: SupabaseClient, userId: string, athleteId: string, schoolId: string, on: boolean): Promise<boolean> {
  if (on) {
    const { error } = await admin.from(TABLE).upsert({ athlete_id: athleteId, school_id: schoolId, sent_by_user_id: userId }, { onConflict: "athlete_id,school_id", ignoreDuplicates: true })
    return !error
  }
  const { error } = await admin.from(TABLE).delete().eq("athlete_id", athleteId).eq("school_id", schoolId)
  return !error
}

export type InterestedWrestler = { id: string; name: string; classYear: number | null; weight: string | null; highSchool: string | null; photo: string | null; at: string }

/**
 * The wrestlers interested in one program, newest first, for its coaches' dashboard. Only the
 * program's own gender (a men's coach sees boys), and only wrestlers still in high school.
 */
export async function interestedInProgram(admin: SupabaseClient, schoolId: string, gender: "Male" | "Female" | null): Promise<InterestedWrestler[]> {
  const { data, error } = await admin.from(TABLE).select("athlete_id, created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(200)
  if (error || !data?.length) return []
  const at = new Map(data.map((r) => [String(r.athlete_id), String(r.created_at)]))
  const { data: athletes } = await admin.from("athletes").select("id, name, graduationyear, weightclass, highschool, gender, photourl").in("id", [...at.keys()])
  const graduated = mostRecentGraduatedClassYear()
  return (athletes ?? [])
    .filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
    .filter((a) => !gender || !a.gender || a.gender === gender)
    .map((a) => ({
      id: String(a.id),
      name: String(a.name ?? ""),
      classYear: a.graduationyear ? Number(a.graduationyear) : null,
      weight: null,
      highSchool: (a.highschool as string | null) ?? null,
      photo: (a.photourl as string | null) ?? null,
      at: at.get(String(a.id))!,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
}
