import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { classifyViewer } from "@/lib/viewer-role"
import { familyAthleteIds } from "@/lib/coach-messages"
import { mostRecentGraduatedClassYear } from "@/lib/class-years"
import { rankingBoardHome } from "@/lib/rankings/ranking-board-home"

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
/**
 * A family - a wrestler, or a parent linked to one - lands on the Recruiting Command Center, which
 * leads with their wrestler and a one-tap way to his or her profile (Matt, 15 October 2026: "when
 * parents or kids log in we should make it super easy to get to their profile"). They had been
 * landing on the rankings, and nine in ten then went looking for the profile through /profile.
 */
export const COMMAND_CENTER = "/my-recruiting"
/**
 * Off until the Command Center is finished (Matt, 15 Oct 2026: "we are still building"). Set
 * FAMILY_LANDING_COMMAND_CENTER=1 in Vercel to send families there; nothing else needs to change.
 */
const FAMILIES_LAND_ON_COMMAND_CENTER = process.env.FAMILY_LANDING_COMMAND_CENTER === "1"

/** Whether this account is family for a wrestler still in school. Graduates have nothing left to plan. */
async function hasWrestlerInSchool(admin: SupabaseClient, userId: string): Promise<boolean> {
  const ids = await familyAthleteIds(admin, userId)
  if (!ids.length) return false
  const { data } = await admin.from("athletes").select("graduationyear").in("id", ids)
  const graduated = mostRecentGraduatedClassYear()
  return (data ?? []).some((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
}

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
    // Somebody who ranks a board for us goes to their board, not to a page selling the rankings.
    if (profile?.is_admin !== true) {
      const { data: account } = await admin.auth.admin.getUserById(userId)
      const board = rankingBoardHome(account?.user?.app_metadata)
      if (board) return board
    }
    // Families go to their wrestler. Admins keep the rankings even when they have children.
    if (FAMILIES_LAND_ON_COMMAND_CENTER && profile?.is_admin !== true && who.kind !== "admin" && !who.isCollegeCoach && (await hasWrestlerInSchool(admin, userId))) {
      return COMMAND_CENTER
    }
    const { viewer } = await resolveRankingViewerForUser({ admin, userId })
    return canSeeProspectRanking(viewer) ? RANKINGS_HOME : RANKINGS_SALES
  } catch {
    return RANKINGS_SALES
  }
}
