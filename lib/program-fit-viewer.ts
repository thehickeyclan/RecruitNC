/**
 * Who is asking about a program's standard, and what they may be checked against.
 *
 * One reading for the perfect-recruit page, the flag on a profile and the flags on a board, so
 * the three cannot disagree about the same coach.
 */
import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { classifyViewer } from "@/lib/viewer-role"
import { releasesPersonalData, scoutingAccessTier } from "@/lib/scouting-report-access"
import { hasAnyCriteria } from "@/lib/program-fit"
import { loadProgramFit, resolveProgramScope, type SavedProgramFit } from "@/lib/program-fit-store"

export type FitViewer = {
  /** A verified college coach or an admin - the only people a standard is for. */
  allowed: boolean
  /** May be checked against GPA, test scores and major. */
  personal: boolean
  saved: SavedProgramFit | null
  /** The saved standard has at least one need to check. */
  hasStandard: boolean
}

export async function resolveFitViewer(admin: SupabaseClient, userId: string): Promise<FitViewer> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, verified_method, is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  const who = classifyViewer(profile ?? null)
  const isAdmin = who.kind === "admin" || profile?.is_admin === true
  const allowed = isAdmin || (who.isCollegeCoach && who.verifiedCoach)
  if (!allowed) return { allowed: false, personal: false, saved: null, hasStandard: false }
  const personal = releasesPersonalData(
    scoutingAccessTier({
      isCollegeCoach: who.isCollegeCoach,
      isAdmin,
      verifiedCoach: who.verifiedCoach || isAdmin,
      verifiedMethod: (profile?.verified_method as string) ?? null,
    }),
  )
  const saved = await loadProgramFit(admin, await resolveProgramScope(admin, userId))
  return { allowed, personal, saved, hasStandard: Boolean(saved && hasAnyCriteria(saved.criteria)) }
}
