import { canonicalRole, isCollegeCoachRole } from "@/lib/coach-auto-approve"

/**
 * What a brand-new account is allowed to declare itself, and what that earns.
 *
 * Kept out of the route so it can be tested directly: this is the decision that hands a college
 * coach athlete GPAs, phone numbers and email addresses belonging to minors, and "I read it and
 * it looked right" is not a test.
 */

/** Exactly the picker on the sign-up form. Anything else is not a role we issue. */
export const ALLOWED_PROFILE_TYPES = new Set([
  "athlete",
  "parent",
  "college-coach",
  "hs-club-coach",
  "referee",
  "fan",
])

/**
 * A role already worth keeping — the account has answered this once.
 *
 * `user` and `fan` are the defaults written when nobody asked, so they do not count as answers.
 */
export function alreadyAnswered(role: string | null | undefined): boolean {
  const value = String(role ?? "").trim().toLowerCase()
  return value.length > 0 && value !== "user" && value !== "fan"
}

export type CompleteProfileDecision =
  | { ok: false; status: 400 | 409; error: string }
  | { ok: true; role: string; verifiedCoach: boolean; redirectTo: string }

export function decideCompleteProfile(input: {
  requestedType: string
  existingRole: string | null | undefined
  email: string | null | undefined
}): CompleteProfileDecision {
  const requested = String(input.requestedType ?? "").trim()
  if (!ALLOWED_PROFILE_TYPES.has(requested)) {
    return { ok: false, status: 400, error: "Choose one of the listed profile types." }
  }

  // The one-time rule. Without it, any signed-in account could re-declare itself a college coach
  // and let itself straight into minors' contact details.
  if (alreadyAnswered(input.existingRole)) {
    return { ok: false, status: 409, error: "This account already has a profile type. Ask an admin to change it." }
  }

  const role = canonicalRole(requested)!
  /*
   * Every college coach is let in, then reviewed. This used to admit only `.edu` addresses and
   * park everyone else on a pending page nobody was told about - a coach who signed in with Google
   * on a personal address waited on a person who did not know they existed. Access now comes
   * first, the account stays "pending" for staff to confirm or reject, and staff are texted.
   * `email` is kept on the input for callers; it no longer decides anything.
   */
  const verifiedCoach = isCollegeCoachRole(role)
  // The rankings are what coaches sign up for.
  const redirectTo = verifiedCoach ? "/public-rankings" : "/"

  return { ok: true, role, verifiedCoach, redirectTo }
}
