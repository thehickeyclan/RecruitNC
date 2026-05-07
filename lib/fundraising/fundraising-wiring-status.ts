import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Admin-visible wiring for gift-page edits (`userCanManageFundraisingForAthlete` — non-admin paths).
 * Matches explicit `parent_athlete_links` + `user_profiles.athlete_id` only (no roster email guessing).
 */
export type FundraisingWiringAdminSnapshot = {
  parentAthleteLinkCount: number
  userProfilesAthleteIdMatchCount: number
}

export function emptyFundraisingWiringSnapshot(): FundraisingWiringAdminSnapshot {
  return { parentAthleteLinkCount: 0, userProfilesAthleteIdMatchCount: 0 }
}

/** True when some RecruitNC login can edit the fundraising story without being staff. */
export function fundraisingWiringLooksReadyForNonAdminEdits(s: FundraisingWiringAdminSnapshot): boolean {
  return s.parentAthleteLinkCount > 0 || s.userProfilesAthleteIdMatchCount > 0
}

export async function getFundraisingWiringSnapshotsForAthleteIds(
  admin: SupabaseClient,
  athleteIdsInput: string[],
): Promise<Map<string, FundraisingWiringAdminSnapshot>> {
  const ids = [...new Set(athleteIdsInput.map((id) => id.trim()).filter(Boolean))]
  const map = new Map<string, FundraisingWiringAdminSnapshot>()
  for (const id of ids) map.set(id, emptyFundraisingWiringSnapshot())
  if (ids.length === 0) return map

  const [{ data: links, error: linkErr }, { data: profiles, error: profErr }] = await Promise.all([
    admin.from("parent_athlete_links").select("athlete_id").in("athlete_id", ids),
    admin.from("user_profiles").select("athlete_id").in("athlete_id", ids),
  ])

  if (linkErr) console.warn("[fundraising-wiring-status] parent_athlete_links", linkErr.message)
  if (profErr) console.warn("[fundraising-wiring-status] user_profiles athlete_id", profErr.message)

  for (const row of links ?? []) {
    const aid = typeof row.athlete_id === "string" ? row.athlete_id.trim() : ""
    if (!aid || !map.has(aid)) continue
    const cur = map.get(aid)!
    map.set(aid, { ...cur, parentAthleteLinkCount: cur.parentAthleteLinkCount + 1 })
  }
  for (const row of profiles ?? []) {
    const aid = typeof row.athlete_id === "string" ? row.athlete_id.trim() : ""
    if (!aid || !map.has(aid)) continue
    const cur = map.get(aid)!
    map.set(aid, { ...cur, userProfilesAthleteIdMatchCount: cur.userProfilesAthleteIdMatchCount + 1 })
  }

  return map
}

export async function getFundraisingWiringAdminSnapshot(
  admin: SupabaseClient,
  athleteId: string | null | undefined,
): Promise<FundraisingWiringAdminSnapshot | null> {
  const id = typeof athleteId === "string" ? athleteId.trim() : ""
  if (!id) return null
  const m = await getFundraisingWiringSnapshotsForAthleteIds(admin, [id])
  return m.get(id) ?? emptyFundraisingWiringSnapshot()
}
