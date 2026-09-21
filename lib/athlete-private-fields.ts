import type { SupabaseClient } from "@supabase/supabase-js"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * What never leaves the server for a viewer who has not earned it.
 *
 * The athletes row is a hundred columns wide and the public profile renders a couple of dozen of
 * them. The filtering used to live entirely in the React component — `canSeePrivateInfo` decides
 * whether to draw a phone number — which hides nothing: the whole row still travelled to the
 * browser, and `/api/athlete/[id]` handed it to anyone who asked, unauthenticated. A wrestler's
 * cell, email, GPA and date of birth were one URL away, and most of these wrestlers are minors.
 *
 * So the row is stripped here, on the way out, and the component's rule is enforced rather than
 * merely honoured. A denylist rather than an allowlist because this guards an existing payload
 * that many surfaces already read; the mobile endpoint, which had no such history, uses an
 * allowlist instead and is the safer pattern for anything new.
 */

/** Contact, academics, age, money, and the internal notes nobody outside the staff should read. */
export const PRIVATE_ATHLETE_FIELDS = [
  // Contact
  "phone",
  "cell",
  "cell_number",
  "contactEmail",
  "contact_email",
  "email",
  "email_address",
  "location",
  // Academics — the profile page says out loud that these are for coaches and admins only
  "academic_gpa",
  "academic_sat",
  "academic_act",
  "gpa",
  "sat",
  "act",
  // Age. A birthdate on a minor is not a competition fact.
  "birthdate",
  "dob",
  "date_of_birth",
  // Payout handles, from the fundraising side
  "venmo_handle",
  "zelle_email",
  // Internal: scouting notes, overrides and who touched the row
  "prospect_notes",
  "evaluation_notes",
  "star_rating_override",
  "star_rating_override_at",
  "star_rating_override_by",
  "star_rating_override_reason",
  "claimed_by_user_id",
  "added_by_coach_id",
  "last_edited_by",
  "admin_reviewed",
] as const

export function stripPrivateAthleteFields<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row }
  for (const field of PRIVATE_ATHLETE_FIELDS) delete out[field]
  return out
}

/**
 * Whether this viewer may see the fields above — the same rule the profile page draws with:
 * the athlete themselves, an admin, or a verified coach.
 *
 * A linked parent is deliberately not included: the page shows them view statistics, not the
 * private block, and this is not the place to widen that.
 */
export async function viewerMaySeeAthletePrivateInfo(
  supabase: SupabaseClient,
  athlete: { claimed_by_user_id?: unknown } | null | undefined,
): Promise<boolean> {
  const { data } = await supabase.auth.getUser()
  const viewerId = data.user?.id
  if (!viewerId) return false

  if (athlete?.claimed_by_user_id && String(athlete.claimed_by_user_id) === viewerId) return true

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, verified_coach, is_admin, profile_type")
    .eq("id", viewerId)
    .maybeSingle()

  if (!profile) return false
  if ((profile as { is_admin?: unknown }).is_admin === true) return true

  const viewer = classifyViewer(profile as Parameters<typeof classifyViewer>[0])
  return viewer.kind === "admin" || viewer.verifiedCoach
}
