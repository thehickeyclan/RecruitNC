import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAthleteUpdateFromRequest, type EditRequestData } from "@/lib/admin/apply-edit-request"
import { resolveClubName, resolveSchoolName } from "@/lib/admin/canonical-affiliations"

/**
 * Write a profile-update request's structured fields onto the athlete: the admin Approve button
 * and, since 30 October 2026, the family's own submission (Matt: "this should have all been
 * cleaned up automatically" - club and cell changes sat a week waiting for a click).
 *
 * Club and school names are logo join keys: the registry's spelling is taken, and a name not in
 * the registry is refused into `manual` rather than written as text that resolves to no crest.
 */
export async function applyRequestToProfile(
  svc: SupabaseClient,
  athleteId: string,
  requestData: EditRequestData,
): Promise<{ applied: Record<string, string | number>; manual: string[]; error: string | null }> {
  const { data: current } = await svc
    .from("athletes")
    .select("wrestlingClub, highschool")
    .eq("id", athleteId)
    .maybeSingle<{ wrestlingClub: string | null; highschool: string | null }>()
  const plan = buildAthleteUpdateFromRequest(requestData)
  const applied = plan.updates
  let manual = plan.manual

  if (typeof applied.wrestlingClub === "string") {
    const club = await resolveClubName(svc, applied.wrestlingClub, current?.wrestlingClub ?? null)
    if (club.ok) {
      applied.wrestlingClub = club.canonical
      if (club.clubId != null) applied.wrestling_club_id = club.clubId
    } else {
      delete applied.wrestlingClub
      manual = [...manual, `Club not applied: ${club.reason}`]
    }
  }
  if (typeof applied.highschool === "string") {
    const school = await resolveSchoolName(svc, applied.highschool, current?.highschool ?? null)
    if (school.ok) applied.highschool = school.canonical
    else {
      delete applied.highschool
      manual = [...manual, `School not applied: ${school.reason}`]
    }
  }

  if (Object.keys(applied).length > 0) {
    const { error } = await svc
      .from("athletes")
      .update({ ...applied, updated_at: new Date().toISOString() })
      .eq("id", athleteId)
    if (error) return { applied: {}, manual, error: error.message }
  }
  return { applied, manual, error: null }
}

/** The wrestler's own account, a linked parent, or an admin: the people whose word is the profile. */
export async function isFamilyOrAdmin(svc: SupabaseClient, userId: string | null, athleteId: string): Promise<boolean> {
  if (!userId) return false
  const [{ data: link }, { data: athlete }, { data: profile }] = await Promise.all([
    svc.from("parent_athlete_links").select("athlete_id").eq("user_id", userId).eq("athlete_id", athleteId).maybeSingle(),
    svc.from("athletes").select("claimed_by_user_id").eq("id", athleteId).maybeSingle(),
    svc.from("user_profiles").select("is_admin").eq("user_id", userId).maybeSingle(),
  ])
  return Boolean(link) || String(athlete?.claimed_by_user_id ?? "") === userId || profile?.is_admin === true
}
