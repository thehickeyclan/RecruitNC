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

    // Scholarship submissions contain confidential information about minors.
    // Keep the review portal admin-only unless NC United deliberately adds a
    // separate, consent-based reviewer release workflow in the future.
    if (!isRecruitNcAdmin) {
      return { ok: false }
    }

    return { ok: true, userId, isRecruitNcAdmin, reviewers: [] }
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
