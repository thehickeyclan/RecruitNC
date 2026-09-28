/**
 * Who may see a wrestler's RecruitNC ranking.
 *
 * The ranking is the thing this platform charges for. It was printed on every public profile —
 * "RecruitNC #5 · Class of 2027" — under the athlete's name, to anybody who opened the page, so
 * the whole board could be reconstructed by walking the roster. A product given away on the
 * profile cannot be sold on the subscription.
 *
 * It stays visible to the people it is for: NC United Blue members, who pay for it; RecruitNC
 * subscribers, who buy it; verified college coaches, who are the audience the ranking exists to
 * serve; and admins. Owning the profile is not enough - a ranked wrestler sees their number
 * through a Blue membership or a subscription, like everybody else.
 *
 * This decides visibility only. Whether a number exists at all — whether the class is published
 * and the wrestler inside the published cut — is a separate question answered before this one.
 */


export type RankingViewer = {
  isAdmin?: boolean
  /** A coach whose credential has been checked, which is how college coaches are identified. */
  isVerifiedCoach?: boolean
  role?: string | null
  /** Current, paid-or-comped NC United Blue membership on this account. */
  isBlueMember?: boolean
  /** The viewer is this athlete, or a parent linked to them. */
  isOwnProfile?: boolean
  /**
   * A live RecruitNC subscription — the way somebody outside the Blue program buys the
   * rankings. Blue is a wrestling program with a membership fee; a college coach's colleague,
   * a recruiting service or an out-of-state parent has no business joining it and until now
   * had no way to pay for the rankings at all.
   */
  hasSubscription?: boolean
}

/**
 * One entitlement, for everything the platform sells.
 *
 * Rankings, profile analytics and "who viewed my profile" were gated on three different
 * questions, and one of them was plainly wrong: coach views checked the paid subscription
 * alone, so a Blue family — who pay more, for a programme this is meant to be a benefit of —
 * could not see which colleges had looked at their own child, while a $9.99 subscriber could.
 *
 * The deal is simple, so the code should be: Blue members get everything, a RecruitNC
 * subscriber buys the same bundle, verified college coaches are free because their reading is
 * what makes it worth buying, and a free account can view profiles and edit its own and
 * nothing more.
 */
export function hasPremiumAccess(viewer: RankingViewer | null | undefined): boolean {
  if (!viewer) return false
  if (viewer.isAdmin) return true
  if (viewer.isVerifiedCoach) return true
  if (viewer.isBlueMember === true) return true
  return viewer.hasSubscription === true
}

export function canSeeProspectRanking(viewer: RankingViewer | null | undefined): boolean {
  if (!viewer) return false
  /*
   * A wrestler seeing their own ranking used to be allowed, and is not any more.
   *
   * The reasoning was that telling somebody they are ranked and hiding the number is worse
   * than not ranking them. In practice it made the ranking readable by anyone who claimed a
   * profile, which is the whole board one account at a time, and it meant the product we sell
   * was free to the people most motivated to share it.
   *
   * A ranked wrestler whose family is in Blue still sees it, as does one whose family
   * subscribes. What no longer follows is owning the profile.
   */
  if (viewer.isAdmin) return true
  /*
   * Verification, not the role the account picked for itself.
   *
   * "College Coach" is an option in the dropdown at /auth/signup, and the role it writes used
   * to be enough on its own. That made the paywall optional: anyone willing to choose a
   * different word about themselves got every board free. Six accounts already hold the role
   * without verification, and they read like supporters rather than programmes.
   *
   * A real coach is not inconvenienced - 37 of the 43 college-coach accounts are already
   * verified, and the rest sit in the approval queue where an admin can clear them in a click.
   * `verified_coach` is set by that human check, which is the thing worth trusting.
   *
   * (Both "college-coach" and "college_coach" are stored in production; `normalizeRole` folds
   * them, and is still used wherever the role legitimately decides something.)
   */
  if (viewer.isVerifiedCoach) return true
  if (viewer.isBlueMember === true) return true
  return viewer.hasSubscription === true
}

/** What a viewer without access is told, which is an offer rather than a refusal. */
export const RANKING_LOCKED_LABEL = "Ranking · NC United Blue"
