/**
 * Who viewed a profile — one classifier for the write path, the backfill, and any read.
 *
 * Background: profile views recorded `user_profiles.profile_type`, which nobody maintains.
 * 13 of 14 college coaches have profile_type "fan" while their role is "college_coach", so
 * ~88% of coach views were filed as fan views. `role` is the field that's actually kept
 * current; classify from it and treat profile_type as a legacy hint only.
 *
 * Roles are stored in both hyphen and underscore spellings ("college-coach" and
 * "college_coach" both exist in prod), so normalize before comparing — the check in
 * contexts/auth-context.tsx compares underscore forms literally and therefore misses every
 * hyphenated coach.
 */

export type ViewerKind =
  | "college_coach"
  | "hs_coach"
  | "athlete"
  | "parent"
  | "admin"
  | "fan"
  | "other"
  | "anonymous"

export type ViewerClassification = {
  kind: ViewerKind
  /** Any coach, college or high-school/club. Admins are NOT coaches here. */
  isCoach: boolean
  /** The number that matters to a recruit. */
  isCollegeCoach: boolean
  verifiedCoach: boolean
  /** Normalized role as stored, for auditing. "anonymous" when signed out. */
  role: string
}

/** Lowercase, trim, and fold hyphens to underscores so spelling variants collapse. */
export function normalizeRole(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

const COLLEGE_COACH_ROLES = new Set(["college_coach"])
// Bare "coach" reads as high-school/club: every prod row with role "coach" that has a
// profile_type set says "hs-club-coach".
const HS_COACH_ROLES = new Set(["hs_club_coach", "coach", "club_coach", "hs_coach"])

export type ViewerProfileInput = {
  role?: unknown
  verified_coach?: unknown
  /** Legacy, unmaintained. Only consulted when role is absent. */
  profile_type?: unknown
} | null | undefined

/**
 * Classify a viewer from their user_profiles row. Pass null/undefined for signed-out.
 *
 * Admins are deliberately their own bucket, not coaches — auth-context's isCoach folds
 * admin in, which is right for permissions and wrong for "how many coaches viewed me"
 * (admin accounts account for ~1,000 of the views on this site).
 */
export function classifyViewer(profile: ViewerProfileInput): ViewerClassification {
  if (!profile) {
    return { kind: "anonymous", isCoach: false, isCollegeCoach: false, verifiedCoach: false, role: "anonymous" }
  }

  const role = normalizeRole(profile.role)
  const verifiedCoach = profile.verified_coach === true
  // Fall back to profile_type only when role is missing entirely.
  const effective = role || normalizeRole(profile.profile_type)

  let kind: ViewerKind
  if (effective === "admin") kind = "admin"
  else if (COLLEGE_COACH_ROLES.has(effective)) kind = "college_coach"
  else if (HS_COACH_ROLES.has(effective)) kind = "hs_coach"
  else if (effective === "athlete") kind = "athlete"
  else if (effective === "parent") kind = "parent"
  else if (effective === "fan") kind = "fan"
  else kind = "other"

  const isCollegeCoach = kind === "college_coach"
  return {
    kind,
    isCoach: isCollegeCoach || kind === "hs_coach",
    isCollegeCoach,
    verifiedCoach,
    role: effective || "unknown",
  }
}
