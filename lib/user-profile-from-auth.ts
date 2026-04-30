import type { User } from "@supabase/supabase-js"

/**
 * Payload for inserting/updating `user_profiles` from Supabase Auth user + metadata.
 * Keeps signup/callback and profile API auto-heal aligned.
 */
export function buildUserProfileUpsertPayload(user: User): Record<string, unknown> {
  const md = user.user_metadata ?? {}
  const profileType = String(md.profile_type ?? md.profileType ?? "")
  let role: "user" | "coach" | "admin" = "user"
  let verifiedCoach = false

  const isCollegeCoach =
    profileType === "college" || profileType === "coach" || profileType === "college-coach"
  const isCoachProfile = isCollegeCoach || profileType === "hs-club-coach"
  if (isCoachProfile) {
    role = "coach"
    verifiedCoach = isCollegeCoach
  }

  return {
    user_id: user.id,
    email: user.email ?? "",
    full_name: String(md.full_name ?? md.fullName ?? ""),
    first_name: String(md.first_name ?? md.firstName ?? ""),
    last_name: String(md.last_name ?? md.lastName ?? ""),
    cell_phone: String(md.cell_phone ?? md.cellPhone ?? ""),
    profile_type: profileType,
    role,
    verified_coach: verifiedCoach,
    is_admin: false,
  }
}
