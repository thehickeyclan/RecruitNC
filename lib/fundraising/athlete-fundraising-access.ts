import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Who may edit the fundraising story on `/fundraising/athletes/[slug]` (and PATCH fundraising-bio),
 * and who sees private supporter contact rows (email/phone) on that page — never public visitors.
 * - `user_profiles.is_admin` (RecruitNC staff), or
 * - `parent_athlete_links` for that athlete (parent linked in admin), or
 * - same user as `user_profiles.athlete_id` when it equals this athlete (athlete’s own login), or
 * - login email matches `athletes.contact_email` / `email` / common contact columns for this athlete (pre-link bootstrap).
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
    console.warn("[athlete-fundraising-access] user_profiles athlete_id", error.message)
    return null
  }
  const aid = (data as { athlete_id?: string | null } | null)?.athlete_id
  return typeof aid === "string" && aid.trim() ? aid.trim() : null
}

function normalizeEmailForFundraisingAccess(raw: string | null | undefined): string | null {
  const t = (raw ?? "").trim().toLowerCase()
  return t.includes("@") ? t : null
}

/** Emails on `athletes` that may identify who should manage this kid’s fundraising page without parent_athlete_links. */
function contactEmailsFromAthleteRow(row: Record<string, unknown>): Set<string> {
  const out = new Set<string>()
  const keys = [
    "contact_email",
    "contactEmail",
    "email",
    "contact_email_secondary",
    "parent_email",
    "parentEmail",
  ] as const
  for (const k of keys) {
    const n = normalizeEmailForFundraisingAccess(typeof row[k] === "string" ? row[k] : undefined)
    if (n) out.add(n)
  }
  return out
}

/**
 * Athletes often log in before staff sets `user_profiles.athlete_id` or `parent_athlete_links`.
 * If their RecruitNC login email matches the roster athlete contact email, allow fundraising edits.
 */
async function fundraisingAccessViaAthleteContactEmail(
  admin: SupabaseClient,
  userId: string,
  athleteId: string,
): Promise<boolean> {
  const [{ data: prof }, { data: ath }] = await Promise.all([
    admin.from("user_profiles").select("email").eq("user_id", userId).maybeSingle(),
    admin.from("athletes").select("*").eq("id", athleteId).maybeSingle(),
  ])
  const loginEmail = normalizeEmailForFundraisingAccess((prof as { email?: string | null } | null)?.email)
  if (!loginEmail || !ath || typeof ath !== "object") return false
  return contactEmailsFromAthleteRow(ath as Record<string, unknown>).has(loginEmail)
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
  return fundraisingAccessViaAthleteContactEmail(admin, userId, athleteId)
}
