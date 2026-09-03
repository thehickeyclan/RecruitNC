"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { userReviewerRoleForScholarship } from "@/lib/scholarships/access"
import { createClient } from "@/lib/supabase/server"

export type SubmitScholarshipReviewResult = { ok: true } | { ok: false; error: string }

export async function submitScholarshipReviewAction(input: {
  applicationId: string
  scholarshipId: string
  comment: string
  score?: number | null
}): Promise<SubmitScholarshipReviewResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return { ok: false, error: "Sign in required." }
  }

  const role = await userReviewerRoleForScholarship(user.id, input.scholarshipId)
  if (!role) {
    return { ok: false, error: "No access." }
  }

  const comment = input.comment.trim().slice(0, 8000)
  let score: number | null =
    typeof input.score === "number" && Number.isFinite(input.score) ? Math.round(input.score) : null

  if (role === "family") {
    score = null
    if (!comment) {
      return { ok: false, error: "Add a comment." }
    }
  } else if (role === "committee") {
    if (score == null || score < 1 || score > 3) {
      return { ok: false, error: "Rank this finalist 1, 2, or 3." }
    }
  } else if (role === "admin") {
    if (score != null && (score < 1 || score > 3)) {
      return { ok: false, error: "Rank must be 1, 2, or 3." }
    }
    if (score == null && !comment) {
      return { ok: false, error: "Add a rank or comment." }
    }
  }

  const admin = createAdminClient()

  const { data: application } = await admin
    .from("scholarship_applications")
    .select("id, scholarship_id, status")
    .eq("id", input.applicationId)
    .maybeSingle()
  if (!application || application.scholarship_id !== input.scholarshipId) {
    return { ok: false, error: "Application not found." }
  }
  if (role !== "admin" && application.status !== "finalist") {
    return { ok: false, error: "This application is not on the finalist ballot." }
  }

  if (score != null) {
    const { data: finalists } = await admin
      .from("scholarship_applications")
      .select("id")
      .eq("scholarship_id", input.scholarshipId)
      .eq("status", "finalist")
    const finalistIds = (finalists ?? []).map((row) => row.id as string)
    const { data: priorReviews } = finalistIds.length
      ? await admin
          .from("scholarship_reviews")
          .select("application_id, score, created_at")
          .eq("reviewer_id", user.id)
          .in("application_id", finalistIds)
          .order("created_at", { ascending: false })
      : { data: [] }

    const latestByApplication = new Map<string, number | null>()
    for (const review of priorReviews ?? []) {
      if (!latestByApplication.has(review.application_id)) {
        latestByApplication.set(review.application_id, review.score)
      }
    }
    const duplicate = [...latestByApplication.entries()].find(
      ([applicationId, existingRank]) => applicationId !== input.applicationId && existingRank === score,
    )
    if (duplicate) {
      return { ok: false, error: `You already assigned rank ${score} to another finalist. Use each rank once.` }
    }
  }

  const reviewerName = (typeof user.email === "string" && user.email.trim()) || "Reviewer"

  const { error } = await admin.from("scholarship_reviews").insert({
    application_id: input.applicationId,
    reviewer_id: user.id,
    reviewer_name: reviewerName.slice(0, 200),
    reviewer_role: role === "admin" ? "admin" : role,
    score,
    comment: comment || null,
    is_finalist_vote: false,
  })

  if (error) {
    console.error("[submitScholarshipReviewAction]", error)
    return { ok: false, error: "Could not save review." }
  }

  revalidatePath("/scholarships/review")
  revalidatePath(`/scholarships/review/${input.applicationId}`)
  return { ok: true }
}
