import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { familyAthleteIds } from "@/lib/coach-messages"
import { HOME_STATE, athleteStateCode } from "@/lib/recruiting/states"

/**
 * The state a family's recruiting is about: their wrestler's (the oldest still listed). A RecruitNC
 * family sees North Carolina's alumni and commits, a RecruitSC family South Carolina's (Matt,
 * 17 Oct 2026). North Carolina when the account has no wrestler, or for a coach.
 */
export async function familyState(admin: SupabaseClient, userId: string | null | undefined): Promise<string> {
  if (!userId) return HOME_STATE
  const ids = await familyAthleteIds(admin, userId).catch(() => [] as string[])
  if (!ids.length) return HOME_STATE
  const { data } = await admin.from("athletes").select("state, is_nc_athlete, graduationyear").in("id", ids).order("graduationyear", { ascending: true }).limit(1)
  return athleteStateCode(data?.[0] ?? null) ?? HOME_STATE
}
