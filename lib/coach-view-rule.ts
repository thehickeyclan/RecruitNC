import { classifyViewer, type ViewerProfileInput } from "@/lib/viewer-role"
import { isInternalAccount } from "@/lib/internal-accounts"

/**
 * The one test for "does this view count as college interest".
 *
 * There were four answers to this question and they disagreed. The family's panel filtered on
 * `is_college_coach` in the event payload; the admin leaderboard filtered on the profile's role;
 * the college-interest report used the payload flag again; and none of them excluded the Apple
 * review logins. A wrestler's page said two college programmes had looked while the admin page
 * said three, about the same three events.
 *
 * The payload flag is the root of it. It is stamped when the view is recorded, from
 * `profile_type` - a field nobody maintains, on which most college coaches are filed as "fan" -
 * so a real coach view was written down as not-a-coach and stayed wrong for ever. Deciding on
 * read instead means history corrects itself whenever a role is fixed, with no backfill.
 *
 * Two exclusions, both deliberate:
 *
 * - **Admins** are their own kind in `classifyViewer`, so staff browsing never reads as interest.
 * - **Internal accounts** - Apple's reviewers need a working coach login for every release and
 *   behave exactly like a recruiter. Four wrestlers were showing a reviewer's visit as college
 *   interest, and one of them had no other.
 */
export function countsAsCoachView(profile: (ViewerProfileInput & { email?: unknown }) | null): boolean {
  if (!profile) return false
  if (!classifyViewer(profile).isCollegeCoach) return false
  return !isInternalAccount(profile.email as string)
}
