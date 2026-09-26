/**
 * Who may see a wrestler's RecruitNC ranking.
 *
 * The ranking is the thing this platform charges for. It was printed on every public profile —
 * "RecruitNC #5 · Class of 2027" — under the athlete's name, to anybody who opened the page, so
 * the whole board could be reconstructed by walking the roster. A product given away on the
 * profile cannot be sold on the subscription.
 *
 * It stays visible to the people it is for: NC United Blue members, who pay for it; verified
 * college coaches, who are the audience the ranking exists to serve; and admins. A wrestler and
 * their linked parent can always see their own number, because telling somebody they are ranked
 * and then hiding the rank from them is worse than not ranking them.
 *
 * This decides visibility only. Whether a number exists at all — whether the class is published
 * and the wrestler inside the published cut — is a separate question answered before this one.
 */

import { normalizeRole } from "./viewer-role"

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

export function canSeeProspectRanking(viewer: RankingViewer | null | undefined): boolean {
  if (!viewer) return false
  if (viewer.isOwnProfile) return true
  if (viewer.isAdmin) return true
  if (viewer.isVerifiedCoach) return true
  /*
   * Hyphen and underscore spellings both exist in production — "college-coach" and
   * "college_coach" — so a literal comparison locks out whichever half is stored the other way.
   * `viewer-role` folds them, and it is the same trap that filed 13 of 14 coaches as fans.
   */
  if (normalizeRole(viewer.role) === "college_coach") return true
  if (viewer.isBlueMember === true) return true
  return viewer.hasSubscription === true
}

/** What a viewer without access is told, which is an offer rather than a refusal. */
export const RANKING_LOCKED_LABEL = "Ranking · NC United Blue"
