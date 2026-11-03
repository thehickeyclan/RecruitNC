/**
 * Which plans a family is sold, by the wrestler's state (Matt, 3 Nov 2026).
 *
 * Insider is the rankings and who viewed the profile, and we rank only the live states (NC, SC). A
 * wrestler anywhere else gets nothing from the rankings, so the plan sold there is the Recruiting
 * Command Center, which carries the profile views itself. Free is the same everywhere.
 *
 * Blue is NC United's own program and is never sold on RecruitWrestlers (Blue includes the RW
 * Command Center through the licence); this rule does not change where Blue is offered.
 *
 * The state is the wrestler's, from the profile the account claimed (school state is platform
 * state). Unknown - signed out, or nothing claimed yet - shows every plan.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import { liveStates } from "@/lib/recruiting/brand"
import { athleteStateCode, normalizeStateCode } from "@/lib/recruiting/states"

export type StatePlans = {
  /** The wrestler's state, or null when the account has none on file. */
  state: string | null
  insider: boolean
  commandCenter: true
}

/** States with rankings: the live ones on RecruitWrestlers, which carries every live state. */
export function rankedStateCodes(): string[] {
  return liveStates(true).map((s) => s.code)
}

export function plansForState(state: string | null | undefined): StatePlans {
  const code = normalizeStateCode(state)
  return { state: code, insider: code == null || rankedStateCodes().includes(code), commandCenter: true }
}

/** The state of the wrestler this account claimed, as a parent or as the wrestler. */
export async function familyStateForUser(admin: SupabaseClient, userId: string): Promise<string | null> {
  const [{ data: own }, { data: links }] = await Promise.all([
    admin.from("athletes").select("state, is_nc_athlete").eq("claimed_by_user_id", userId).limit(1),
    admin.from("parent_athlete_links").select("athlete_id").eq("user_id", userId).limit(5),
  ])
  const ownCode = athleteStateCode((own ?? [])[0] ?? null)
  if (ownCode) return ownCode
  const ids = (links ?? []).map((l) => String((l as { athlete_id: string }).athlete_id))
  if (!ids.length) return null
  const { data: kids } = await admin.from("athletes").select("state, is_nc_athlete").in("id", ids)
  return (kids ?? []).map((k) => athleteStateCode(k)).find(Boolean) ?? null
}
