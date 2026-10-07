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

export function mayUseComparison(viewer: {
  isAdmin?: boolean | null
  profile: (ViewerProfileInput & { is_admin?: unknown }) | null | undefined
}): boolean {
  const classified = classifyViewer(viewer.profile ?? null)
  if (viewer.isAdmin === true || classified.kind === "admin" || viewer.profile?.is_admin === true) return true
  return classified.isCollegeCoach && classified.verifiedCoach
}
