import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Who may edit the fundraising story on `/fundraising/athletes/[slug]` (and PATCH fundraising-bio),
 * and who sees private supporter contact rows (email/phone) on that page — never public visitors.
 * - `user_profiles.is_admin` (RecruitNC staff — verify `is_admin` is never set for plain parent accounts), or
 * - `parent_athlete_links` for that athlete (parent linked via Attach parent), or
 * - same user as `user_profiles.athlete_id` when it equals this athlete (wrestler’s own login).
 *
 * We intentionally do **not** grant access via roster contact-email matching: shared or duplicated emails on `athletes`
 * caused parents to match many unrelated profiles.
 */
export type FundraisingPageManagerAccess = "none" | "linked"

export async function userIsRecruitNcAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
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

async function userProfileAthleteId(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.from("user_profiles").select("athlete_id").eq("user_id", userId).maybeSingle()
  if (error) {
    const code = (error as { code?: string }).code
    if (code !== "42P01" && code !== "42703") {
      console.warn("[athlete-fundraising-access] user_profiles athlete_id", error.message)
    }
    return null
  }
  const aid = (data as { athlete_id?: string | null } | null)?.athlete_id
  return typeof aid === "string" && aid.trim() ? aid.trim() : null
}

export async function userCanManageFundraisingForAthlete(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  if (await userIsRecruitNcAdmin(admin, userId)) return true
  const access = await getFundraisingPageManagerAccess(admin, userId, athleteId)
  if (access !== "none") return true
  const selfAid = await userProfileAthleteId(admin, userId)
  if (selfAid && selfAid === athleteId) return true
  return false
}
