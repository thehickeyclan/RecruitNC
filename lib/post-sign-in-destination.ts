import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * Where somebody lands after signing in, when nothing asked to send them somewhere specific.
 *
 * The rankings are what people sign in for. Anyone who can already read them - a Blue family, a
 * subscriber, a verified college coach, staff - goes straight to them; everyone else goes to the
 * page that explains what they include and how to get them. The homepage was the old default,
 * which answered neither. The entitlement check is the one the rankings pages themselves use,
 * so a person is never sent to a board that then turns them away.
 */
export const RANKINGS_HOME = "/public-rankings"
export const RANKINGS_SALES = "/rankings"
/**
 * A verified college coach lands on the one page that holds everything they use (Matt, 10 October
 * 2026). The rankings taught coaches this was a rankings site; most never found the comparison,
 * the scouting reports or their own board from there.
 */
export const COACH_HOME = "/coach-home"

export async function postSignInDestination(admin: SupabaseClient, userId: string | null | undefined): Promise<string> {
  if (!userId) return RANKINGS_SALES
  try {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role, profile_type, verified_coach, is_admin")
      .eq("user_id", userId)
      .maybeSingle()
    const who = classifyViewer(profile ?? null)
    // Admins keep the rankings: they hold the coach flags too, and are not recruiting.
    if (who.kind !== "admin" && profile?.is_admin !== true && who.isCollegeCoach && who.verifiedCoach) return COACH_HOME
    const { viewer } = await resolveRankingViewerForUser({ admin, userId })
    return canSeeProspectRanking(viewer) ? RANKINGS_HOME : RANKINGS_SALES
  } catch {
    return RANKINGS_SALES
  }
}
