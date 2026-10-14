import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Who this coach (or anyone on the same staff) already has on My Recruits.
 *
 * The same rule /api/coaches/starred-athletes uses: a coach linked to a school sees the whole
 * staff's board, so a star one assistant added shows filled for the head coach too.
 */
export async function loadStarredAthleteIds(admin: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data: me } = await admin.from("user_profiles").select("school_id").eq("user_id", userId).maybeSingle()
  let coachIds = [userId]
  if (me?.school_id) {
    const { data: staff } = await admin.from("user_profiles").select("user_id").eq("school_id", me.school_id)
    coachIds = (staff ?? []).map((s) => String(s.user_id)).filter(Boolean)
    if (!coachIds.includes(userId)) coachIds.push(userId)
  }
  const { data } = await admin.from("college_coach_stars").select("athlete_id").in("coach_user_id", coachIds)
  return new Set((data ?? []).map((r) => String(r.athlete_id)))
}
