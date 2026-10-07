/**
 * Where a program's needs live: one row per school, shared by its whole staff, or one per coach
 * when the account has no school (the same split as the My Recruits board).
 *
 * Every save records who made it and when, and the panel prints it - a staff of four editing one
 * set of needs has to be able to see that the 3.0 floor was Coach Smith's change on Tuesday.
 *
 * Table: program_fit_criteria (scripts/sql/create-program-fit-criteria.sql). Server-only; RLS is on
 * with no policies, so browsers cannot reach it except through /api/coaches/program-fit.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { sanitizeCriteria, type ProgramFitCriteria } from "@/lib/program-fit"

export type ProgramScope = { schoolId: string | null; userId: string }

export type SavedProgramFit = {
  criteria: ProgramFitCriteria
  updatedByName: string | null
  updatedAt: string | null
}

export async function resolveProgramScope(admin: SupabaseClient, userId: string): Promise<ProgramScope> {
  const { data } = await admin.from("user_profiles").select("school_id").eq("user_id", userId).maybeSingle()
  return { schoolId: (data?.school_id as string | null) ?? null, userId }
}

/** The column and value that pick this program's row. */
function scopeFilter(scope: ProgramScope): [string, string] {
  return scope.schoolId ? ["school_id", scope.schoolId] : ["owner_user_id", scope.userId]
}

export async function loadProgramFit(admin: SupabaseClient, scope: ProgramScope): Promise<SavedProgramFit | null> {
  const [column, value] = scopeFilter(scope)
  const { data, error } = await admin
    .from("program_fit_criteria")
    .select("criteria, updated_by_name, updated_at")
    .eq(column, value)
    .maybeSingle()
  // A missing table reads as "not set", so the comparison never fails because of this panel.
  if (error || !data) return null
  return {
    criteria: sanitizeCriteria(data.criteria),
    updatedByName: (data.updated_by_name as string | null) ?? null,
    updatedAt: (data.updated_at as string | null) ?? null,
  }
}

export async function saveProgramFit(
  admin: SupabaseClient,
  scope: ProgramScope,
  criteria: ProgramFitCriteria,
): Promise<SavedProgramFit> {
  const { data: who } = await admin
    .from("user_profiles")
    .select("full_name, email")
    .eq("user_id", scope.userId)
    .maybeSingle()
  const updatedByName = String(who?.full_name ?? "").trim() || String(who?.email ?? "").trim() || "A coach"
  const updatedAt = new Date().toISOString()
  const row = {
    criteria,
    updated_by: scope.userId,
    updated_by_name: updatedByName,
    updated_at: updatedAt,
  }

  const [column, value] = scopeFilter(scope)
  const { data: existing } = await admin.from("program_fit_criteria").select("id").eq(column, value).maybeSingle()
  const { error } = existing
    ? await admin.from("program_fit_criteria").update(row).eq("id", existing.id as string)
    : await admin
        .from("program_fit_criteria")
        .insert({ ...row, school_id: scope.schoolId, owner_user_id: scope.schoolId ? null : scope.userId })
  if (error) throw new Error(error.message)
  return { criteria, updatedByName, updatedAt }
}
