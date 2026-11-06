import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

import { academicItems, type AcademicItem, type CheckinRow } from "@/lib/recruiting/academic-checkin"
import { respondentFor } from "@/lib/recruiting/priorities/store"

/**
 * What the Command Center asks about grades and tests for this wrestler, for this login. Null for
 * anyone who isn't the wrestler or a linked parent, and null until scripts/sql/add-academic-checkins.sql
 * has been run.
 */
export async function loadAcademicItems(admin: SupabaseClient, userId: string, athleteId: string): Promise<{ self: boolean; items: AcademicItem[] } | null> {
  const respondent = await respondentFor(admin, userId, athleteId)
  if (!respondent) return null
  const [{ data: a, error }, checkin] = await Promise.all([
    admin.from("athletes").select("academic_gpa, academic_gpa_updated_at, academic_sat, academic_act, graduationyear").eq("id", athleteId).maybeSingle(),
    admin
      .from("academic_checkins")
      .select("gpa_confirmed_at, test_status, test_kind, test_date, test_answered_at")
      .eq("athlete_id", athleteId)
      .maybeSingle()
      .then((r) => (r.error ? { missing: true as const } : { row: r.data as CheckinRow | null })),
  ])
  if (error || !a) return null
  // Until the table exists (or if it can't be read), no card: its answers would have nowhere to go.
  if ("missing" in checkin) return null
  const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v))
  return {
    self: respondent === "athlete",
    items: academicItems({
      gpa: num(a.academic_gpa),
      gpaUpdatedAt: (a.academic_gpa_updated_at as string | null) ?? null,
      sat: num(a.academic_sat),
      act: num(a.academic_act),
      classYear: num(a.graduationyear),
      checkin: checkin.row,
    }),
  }
}
