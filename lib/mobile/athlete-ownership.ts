import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Who may change a wrestler's profile from the phone.
 *
 * The athlete who owns it, or a parent linked to them. Nobody else, including other signed-in
 * users — `canEdit` on the web profile is `Boolean(currentUserId)`, which is true for anyone with
 * an account, and that rule must not follow us onto a write endpoint.
 *
 * Admins are deliberately not included. An admin editing an athlete's own stated GPA or projected
 * weight through the athlete's endpoint would leave a change that looks like the athlete made it;
 * staff edits belong on the admin surfaces, where they are attributed.
 */

export type AthleteOwnership =
  | { ok: true; relationship: "self" | "parent" }
  | { ok: false; status: 401 | 403 | 404; error: string }

export async function resolveAthleteOwnership(
  admin: SupabaseClient,
  athleteId: string,
  viewerId: string | null,
): Promise<AthleteOwnership> {
  if (!viewerId) return { ok: false, status: 401, error: "Sign in to edit this profile." }

  const { data: athlete, error } = await admin
    .from("athletes")
    .select("id, claimed_by_user_id")
    .eq("id", athleteId)
    .maybeSingle()

  if (error || !athlete) return { ok: false, status: 404, error: "That profile does not exist." }

  if (athlete.claimed_by_user_id && String(athlete.claimed_by_user_id) === viewerId) {
    return { ok: true, relationship: "self" }
  }

  const { data: link } = await admin
    .from("parent_athlete_links")
    .select("athlete_id")
    .eq("athlete_id", athleteId)
    .eq("user_id", viewerId)
    .maybeSingle()

  if (link) return { ok: true, relationship: "parent" }

  return {
    ok: false,
    status: 403,
    error: athlete.claimed_by_user_id
      ? "This profile belongs to someone else."
      : "Claim this profile before editing it.",
  }
}
