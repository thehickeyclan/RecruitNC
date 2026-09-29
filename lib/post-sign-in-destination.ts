import type { SupabaseClient } from "@supabase/supabase-js"

import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"

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

export async function postSignInDestination(admin: SupabaseClient, userId: string | null | undefined): Promise<string> {
  if (!userId) return RANKINGS_SALES
  try {
    const { viewer } = await resolveRankingViewerForUser({ admin, userId })
    return canSeeProspectRanking(viewer) ? RANKINGS_HOME : RANKINGS_SALES
  } catch {
    return RANKINGS_SALES
  }
}
