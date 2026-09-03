import { createAdminClient } from "@/lib/supabase/admin"

import type { ScholarshipReviewerRole } from "@/lib/scholarships/types"

export type ScholarshipPortalAccess =
  | { ok: false }
  | {
      ok: true
      userId: string
      isRecruitNcAdmin: boolean
      reviewers: { scholarshipId: string; role: ScholarshipReviewerRole }[]
    }

export async function getScholarshipPortalAccess(userId: string): Promise<ScholarshipPortalAccess> {
  if (!userId) return { ok: false }

  try {
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from("user_profiles")
      .select("is_admin, role")
      .eq("user_id", userId)
      .maybeSingle()

    const isRecruitNcAdmin = profile?.is_admin === true || profile?.role === "admin"

    /*
     * The roster is read for admins too.
     *
     * Being an admin used to end the question, so an admin who was also on a scholarship's panel
     * scored with every name in front of them — the thing a blind process exists to prevent. An
     * admin not on any roster still gets the admin workspace; one who is listed reviews as that
     * role, blind, and administers elsewhere.
     */

    // Reviewers are explicitly scoped to one scholarship. RLS keeps the roster
    // service-role-only; application pages still authorize every request here.
    const { data: reviewerRows, error: reviewerError } = await admin
      .from("scholarship_reviewers")
      .select("scholarship_id, role")
      .eq("user_id", userId)

    if (reviewerError) {
      console.warn("[scholarships] reviewer access lookup:", reviewerError)
      return { ok: false }
    }

    const reviewers = (reviewerRows ?? []).flatMap((row) => {
      if (
        typeof row.scholarship_id !== "string" ||
        (row.role !== "family" && row.role !== "committee" && row.role !== "admin")
      ) {
        return []
      }
      return [{ scholarshipId: row.scholarship_id, role: row.role as ScholarshipReviewerRole }]
    })

    if (reviewers.length === 0) return isRecruitNcAdmin ? { ok: true, userId, isRecruitNcAdmin: true, reviewers: [] } : { ok: false }
    return { ok: true, userId, isRecruitNcAdmin, reviewers }
  } catch (e) {
    console.warn("[scholarships] getScholarshipPortalAccess:", e)
    return { ok: false }
  }
}

export async function userMayViewApplication(userId: string, scholarshipId: string): Promise<boolean> {
  const access = await getScholarshipPortalAccess(userId)
  if (!access.ok) return false
  if (access.isRecruitNcAdmin) return true
  return access.reviewers.some((r) => r.scholarshipId === scholarshipId)
}

export async function userReviewerRoleForScholarship(
  userId: string,
  scholarshipId: string,
): Promise<ScholarshipReviewerRole | "admin" | null> {
  const access = await getScholarshipPortalAccess(userId)
  if (!access.ok) return null
  /** A seat on this scholarship's panel outranks being an admin — you score the way the panel does. */
  const seat = access.reviewers.find((r) => r.scholarshipId === scholarshipId)?.role
  if (seat) return seat
  return access.isRecruitNcAdmin ? "admin" : null
}
