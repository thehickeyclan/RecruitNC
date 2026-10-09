/**
 * Who may use the wrestler comparison: verified college coaches and admins. Nobody else.
 *
 * Matt, 7 October 2026. It was open to Blue members and RecruitNC subscribers too, on the
 * rankings' rule; it is a recruiting tool, and the profile button showed to every visitor.
 * One rule for the API and the button, so the door and the sign on it cannot disagree.
 *
 * "College coach" by role, not `verified_coach` alone - a verified high school coach holds that
 * flag as well (lib/viewer-role.ts).
 */
import { classifyViewer, type ViewerProfileInput } from "@/lib/viewer-role"

/**
 * People testing the comparison who are not college coaches. They see it exactly as a verified
 * coach does - GPA, test scores, stars, the perfect recruit - but only inside the comparison;
 * the rest of the site still treats them as their own role (Matt, 9 October 2026).
 * Add or remove a user id here.
 */
export const COMPARISON_TESTER_USER_IDS = new Set<string>([
  "8d4ed89c-1a52-48cc-9429-ab5c24875a25", // Brandon Palmer - testing, Matt 9 October 2026
])

/** A listed tester sees the comparison as a verified coach does - inside the comparison only. */
export function isComparisonTester(userId: string | null | undefined): boolean {
  return Boolean(userId && COMPARISON_TESTER_USER_IDS.has(userId))
}

export function mayUseComparison(viewer: {
  isAdmin?: boolean | null
  profile: (ViewerProfileInput & { is_admin?: unknown; user_id?: unknown }) | null | undefined
  /** The signed-in user, for the tester list. Falls back to `profile.user_id`. */
  userId?: string | null
}): boolean {
  const uid = String(viewer.userId ?? viewer.profile?.user_id ?? "")
  if (uid && COMPARISON_TESTER_USER_IDS.has(uid)) return true
  const classified = classifyViewer(viewer.profile ?? null)
  if (viewer.isAdmin === true || classified.kind === "admin" || viewer.profile?.is_admin === true) return true
  return classified.isCollegeCoach && classified.verifiedCoach
}
