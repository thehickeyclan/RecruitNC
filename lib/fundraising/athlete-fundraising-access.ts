import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Who may edit the fundraising story and see donor contact details on `/fundraising/athletes/[slug]`.
 * **Only** admin-linked accounts: rows in `parent_athlete_links` (POST `/api/admin/parent-athlete-link`).
 * Staff should pass the RecruitNC `user_id` to link — parent account, athlete account, or both — not `claimed_by_user_id`.
 */
export type FundraisingPageManagerAccess = "none" | "linked"

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
  const access = await getFundraisingPageManagerAccess(admin, userId, athleteId)
  return access !== "none"
}
