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

    const { data: rows, error } = await admin
      .from("scholarship_reviewers")
      .select("scholarship_id, role")
      .eq("user_id", userId)

    if (error) {
      console.warn("[scholarships] getScholarshipPortalAccess reviewers:", error.message)
    }

    const reviewers = (rows ?? [])
      .map((r) => ({
        scholarshipId: r.scholarship_id as string,
        role: r.role as ScholarshipReviewerRole,
      }))
      .filter((r) => r.scholarshipId)

    if (!isRecruitNcAdmin && reviewers.length === 0) {
      return { ok: false }
    }

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
  if (access.isRecruitNcAdmin) return "admin"
  return access.reviewers.find((r) => r.scholarshipId === scholarshipId)?.role ?? null
}
