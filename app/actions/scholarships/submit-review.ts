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
  isFinalistVote?: boolean
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
  let finalist = Boolean(input.isFinalistVote)

  if (role === "family") {
    score = null
    finalist = false
    if (!comment) {
      return { ok: false, error: "Add a comment." }
    }
  } else if (role === "committee") {
    if (score == null || score < 1 || score > 5) {
      return { ok: false, error: "Pick a score from 1–5." }
    }
  } else if (role === "admin") {
    if (score != null && (score < 1 || score > 5)) {
      return { ok: false, error: "Score must be 1–5." }
    }
    if (score == null && !comment && !finalist) {
      return { ok: false, error: "Add a score, comment, or finalist vote." }
    }
  }

  const admin = createAdminClient()

  const reviewerName = (typeof user.email === "string" && user.email.trim()) || "Reviewer"

  const { error } = await admin.from("scholarship_reviews").insert({
    application_id: input.applicationId,
    reviewer_id: user.id,
    reviewer_name: reviewerName.slice(0, 200),
    reviewer_role: role === "admin" ? "admin" : role,
    score,
    comment: comment || null,
    is_finalist_vote: finalist && role !== "family",
  })

  if (error) {
    console.error("[submitScholarshipReviewAction]", error)
    return { ok: false, error: "Could not save review." }
  }

  revalidatePath("/scholarships/review")
  revalidatePath(`/scholarships/review/${input.applicationId}`)
  return { ok: true }
}
