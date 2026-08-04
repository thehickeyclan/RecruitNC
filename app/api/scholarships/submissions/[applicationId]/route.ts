import { NextRequest, NextResponse } from "next/server"

import { parseScholarshipVideoPageUrl } from "@/lib/scholarships/scholarship-video-url"
import { verifyScholarshipSubmissionEditToken } from "@/lib/scholarships/submission-edit-link"
import { createAdminClientFresh } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await ctx.params
  const token = request.headers.get("x-scholarship-edit-token")?.trim() || ""
  if (!UUID_RE.test(applicationId) || !token) {
    return NextResponse.json({ error: "This private edit link is not valid." }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 })
  }

  const admin = createAdminClientFresh()
  const currentResult = await admin.from("scholarship_applications").select("*").eq("id", applicationId).maybeSingle()
  const current = currentResult.data
  if (currentResult.error || !current || typeof current.nominator_email !== "string") {
    return NextResponse.json({ error: "This private edit link is not valid." }, { status: 403 })
  }
  if (!verifyScholarshipSubmissionEditToken(applicationId, current.nominator_email, token)) {
    return NextResponse.json({ error: "This private edit link is not valid." }, { status: 403 })
  }
  if (!new Set(["submitted", "under_review"]).has(String(current.status ?? ""))) {
    return NextResponse.json({ error: "This nomination can no longer be edited online." }, { status: 409 })
  }

  const athleteName = text(body.athlete_name, 200)
  const athleteSchool = text(body.athlete_school, 200)
  const athleteGradYearRaw = text(body.athlete_grad_year, 4)
  const athleteGradYear = athleteGradYearRaw ? Number(athleteGradYearRaw) : null
  const athleteWeightClass = text(body.athlete_weight_class, 60)
  const athleteEmail = text(body.athlete_email, 320).toLowerCase()
  const athletePhone = text(body.athlete_phone, 40)
  const nominatorName = text(body.nominator_name, 200)
  const nominatorRelationship = text(body.nominator_relationship, 120)
  const nominatorPhone = text(body.nominator_phone, 40)
  const nominatorKnownDuration = text(body.nominator_known_duration, 200)
  const writtenStatement = text(body.written_statement, 12000)
  const requestedVideoUrl = text(body.video_url, 2000)

  if (athleteName.length < 3) return NextResponse.json({ error: "Athlete name is required." }, { status: 400 })
  if (athleteGradYear != null && (!Number.isFinite(athleteGradYear) || athleteGradYear < 2024 || athleteGradYear > 2040)) {
    return NextResponse.json({ error: "Enter a valid graduation year." }, { status: 400 })
  }
  if (athleteEmail && !EMAIL_RE.test(athleteEmail)) {
    return NextResponse.json({ error: "Enter a valid athlete or parent email, or leave it blank." }, { status: 400 })
  }
  if (nominatorName.length < 3 || nominatorRelationship.length < 2) {
    return NextResponse.json({ error: "Your name and relationship to the athlete are required." }, { status: 400 })
  }

  const submissionFormat = current.submission_format === "video" ? "video" : "written"
  let videoUrl: string | null = current.video_url ?? null
  if (submissionFormat === "written" && !writtenStatement) {
    return NextResponse.json({ error: "Written nomination is required." }, { status: 400 })
  }
  if (submissionFormat === "video" && requestedVideoUrl) {
    const parsed = parseScholarshipVideoPageUrl(requestedVideoUrl)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    videoUrl = parsed.normalized
  }
  if (submissionFormat === "video" && !videoUrl && !current.video_blob_url) {
    return NextResponse.json({ error: "A video link or uploaded video is required." }, { status: 400 })
  }

  const updatePayload: Record<string, unknown> = {
    athlete_name: athleteName,
    athlete_school: athleteSchool || "Not provided",
    athlete_grad_year: athleteGradYear,
    athlete_weight_class: athleteWeightClass || null,
    athlete_email: athleteEmail || null,
    athlete_phone: athletePhone || null,
    nominator_name: nominatorName,
    nominator_relationship: nominatorRelationship,
    nominator_phone: nominatorPhone || null,
    nominator_known_duration: nominatorKnownDuration || null,
    written_statement: submissionFormat === "written" ? writtenStatement : String(current.written_statement ?? ""),
    video_url: videoUrl,
    reference_name: nominatorName,
    reference_relationship: nominatorRelationship,
    reference_email: current.nominator_email,
    reference_phone: nominatorPhone || null,
  }

  let updated = await admin.from("scholarship_applications").update(updatePayload).eq("id", applicationId)
  if (updated.error?.code === "42703" && updated.error.message?.includes("nominator_known_duration")) {
    delete updatePayload.nominator_known_duration
    updated = await admin.from("scholarship_applications").update(updatePayload).eq("id", applicationId)
  }
  if (updated.error) {
    console.error("[scholarships/submission-edit]", updated.error)
    return NextResponse.json({ error: "Could not save your changes. Your text remains on this page." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
