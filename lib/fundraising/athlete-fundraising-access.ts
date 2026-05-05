import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Who may edit the fundraising story on `/fundraising/athletes/[slug]` (and PATCH fundraising-bio).
 * - `user_profiles.is_admin` (RecruitNC staff), or
 * - `parent_athlete_links` for that athlete (parent/athlete account linked in admin).
 */
export type FundraisingPageManagerAccess = "none" | "linked"

async function userIsRecruitNcAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.from("user_profiles").select("is_admin").eq("user_id", userId).maybeSingle()
  if (error) {
    console.warn("[athlete-fundraising-access] user_profiles", error.message)
    return false
  }
  return !!(data as { is_admin?: boolean } | null)?.is_admin
}

export async function getFundraisingPageManagerAccess(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<FundraisingPageManagerAccess> {
  const { data: link, error: lErr } = await admin
    .from("parent_athlete_links")
    .select("id")
    .eq("user_id", userId)
    .eq("athlete_id", athleteId)
    .maybeSingle()

  if (lErr) {
    console.warn("[athlete-fundraising-access] parent_athlete_links", lErr.message)
    return "none"
  }
  return link ? "linked" : "none"
}

export async function userCanManageFundraisingForAthlete(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  if (await userIsRecruitNcAdmin(admin, userId)) return true
  const access = await getFundraisingPageManagerAccess(admin, userId, athleteId)
  return access !== "none"
}
