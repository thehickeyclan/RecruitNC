import { NextRequest, NextResponse } from "next/server"

import { sendScholarshipApplicationEmails } from "@/lib/email/scholarship-application-email"
import { allocateScholarshipAnonymousId } from "@/lib/scholarships/anonymous-id"
import { scholarshipApplicationsAreOpen } from "@/lib/scholarships/applications-open"
import { sendScholarshipApplicationStaffSms } from "@/lib/scholarships/new-application-staff-sms"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { parseScholarshipVideoBlobUrl, parseScholarshipVideoPageUrl } from "@/lib/scholarships/scholarship-video-url"
import { scholarshipSubmissionEditPath } from "@/lib/scholarships/submission-edit-link"
import { countWords } from "@/lib/scholarships/word-count"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ""
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("schema cache") ||
    (message.includes("could not find the") && message.includes("column"))
  )
}

function truncate(s: string, max: number): string {
  return s.trim().slice(0, max)
}

function scholarshipCycleYear(params: {
  established_year: number | null
  applications_close_date: string | null
}): number {
  const y = params.established_year
  if (typeof y === "number" && Number.isFinite(y) && y >= 2000 && y <= 2100) return y
  const raw = params.applications_close_date?.slice(0, 4)
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isFinite(parsed) && parsed >= 2000) return parsed
  return new Date().getFullYear()
}

function formatUsDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await ctx.params
  const slug = rawSlug.trim().toLowerCase()
  if (!slug) {
    return NextResponse.json({ error: "Invalid scholarship." }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 })
  }

  const hp = typeof body._hp === "string" ? body._hp.trim() : ""
  if (hp) {
    return NextResponse.json({ ok: true })
  }

  const scholarship = await getScholarshipBySlug(slug)
  if (!scholarship) {
    return NextResponse.json({ error: "Scholarship not found." }, { status: 404 })
  }

  if (!scholarshipApplicationsAreOpen(scholarship)) {
    return NextResponse.json({ error: "Applications are not open for this scholarship." }, { status: 403 })
  }

  const athleteName = truncate(String(body.athlete_name ?? ""), 200)
  const athleteSchool = truncate(String(body.athlete_school ?? ""), 200)
  const athleteGradYearRaw = String(body.athlete_grad_year ?? "").trim()
  const athleteGradYear = athleteGradYearRaw ? Number(athleteGradYearRaw) : null
  const athleteWeightClass = truncate(String(body.athlete_weight_class ?? ""), 60)
  const athleteEmail = truncate(String(body.athlete_email ?? "").trim(), 320)
  const athletePhone = truncate(String(body.athlete_phone ?? ""), 40)

  const nominatorName = truncate(String(body.nominator_name ?? ""), 200)
  const nominatorRelationship = truncate(String(body.nominator_relationship ?? ""), 120)
  const nominatorEmail = truncate(String(body.nominator_email ?? "").trim().toLowerCase(), 320)
  const nominatorPhone = truncate(String(body.nominator_phone ?? ""), 40)
  const nominatorKnownDuration = truncate(String(body.nominator_known_duration ?? ""), 200)

  const isParentNominating = /\b(parent|mother|father|mom|dad|guardian)\b/i.test(nominatorRelationship)

  const writtenStatement = String(body.written_statement ?? "").trim()

  const submissionFormatRaw = String(body.submission_format ?? "written").toLowerCase()
  const submissionFormat = submissionFormatRaw === "video" ? "video" : "written"

  const videoUrlRaw = typeof body.video_url === "string" ? body.video_url.trim() : ""
  const videoBlobUrlRaw = typeof body.video_blob_url === "string" ? body.video_blob_url.trim() : ""

  let videoUrl: string | null = null
  let videoBlobUrl: string | null = null
  let writtenStatementToStore = writtenStatement

  if (submissionFormat === "video") {
    const parsedLink = videoUrlRaw ? parseScholarshipVideoPageUrl(videoUrlRaw) : null
    const parsedBlob = videoBlobUrlRaw ? parseScholarshipVideoBlobUrl(videoBlobUrlRaw) : null
    if (parsedLink && !parsedLink.ok && videoUrlRaw) {
      return NextResponse.json({ error: parsedLink.error }, { status: 400 })
    }
    if (parsedBlob && !parsedBlob.ok && videoBlobUrlRaw) {
      return NextResponse.json({ error: parsedBlob.error }, { status: 400 })
    }
    if (parsedLink?.ok && parsedBlob?.ok) {
      return NextResponse.json(
        { error: "Choose either a YouTube/Vimeo link or an uploaded file — not both." },
        { status: 400 },
      )
    }
    if (parsedLink?.ok) videoUrl = parsedLink.normalized
    if (parsedBlob?.ok) videoBlobUrl = parsedBlob.normalized
    if (!videoUrl && !videoBlobUrl) {
      return NextResponse.json(
        { error: "Video nominations need a YouTube/Vimeo link or an uploaded video file." },
        { status: 400 },
      )
    }
    writtenStatementToStore = ""
  } else {
    const wcEssay = countWords(writtenStatement)
    if (wcEssay < 1) {
      return NextResponse.json({ error: "Written nomination is required." }, { status: 400 })
    }
  }

  // The nominator is the reference. Keep the legacy reference columns populated
  // so existing review/admin tools continue to work without asking for duplicate data.
  const referenceName = nominatorName
  const referenceRelationship = nominatorRelationship
  const referenceEmail = nominatorEmail
  const referencePhone = nominatorPhone

  if (athleteName.length < 3) {
    return NextResponse.json({ error: "Athlete name is required." }, { status: 400 })
  }
  if (athleteGradYear != null && (!Number.isFinite(athleteGradYear) || athleteGradYear < 2024 || athleteGradYear > 2040)) {
    return NextResponse.json({ error: "Enter a valid graduation year." }, { status: 400 })
  }
  if (athleteEmail && !EMAIL_RE.test(athleteEmail)) {
    return NextResponse.json({ error: "Enter a valid athlete or parent email, or leave it blank." }, { status: 400 })
  }
  if (nominatorName.length < 3 || nominatorRelationship.length < 2) {
    return NextResponse.json({ error: "Nominator name and relationship are required." }, { status: 400 })
  }
  if (!nominatorEmail || !EMAIL_RE.test(nominatorEmail)) {
    return NextResponse.json({ error: "Nominator email is required." }, { status: 400 })
  }
  const cycleYear = scholarshipCycleYear({
    established_year: scholarship.established_year ?? null,
    applications_close_date: scholarship.applications_close_date ?? null,
  })

  try {
    const admin = createAdminClient()
    const anonymousId = await allocateScholarshipAnonymousId(admin, { slug, year: cycleYear })

    const insertPayload: Record<string, unknown> = {
      scholarship_id: scholarship.id,
      athlete_name: athleteName,
      athlete_school: athleteSchool || "Not provided",
      athlete_grad_year: athleteGradYear,
      athlete_weight_class: athleteWeightClass || null,
      athlete_email: athleteEmail || null,
      athlete_phone: athletePhone || null,
      nominator_name: nominatorName,
      nominator_relationship: nominatorRelationship,
      nominator_email: nominatorEmail,
      nominator_phone: nominatorPhone || null,
      is_parent_nominating_own_child: isParentNominating,
      nominator_known_duration: nominatorKnownDuration || null,
      submission_format: submissionFormat,
      video_url: videoUrl,
      video_blob_url: videoBlobUrl,
      written_statement: writtenStatementToStore.slice(0, 12000),
      wrestling_moment: null,
      reference_name: referenceName,
      reference_relationship: referenceRelationship,
      reference_email: referenceEmail,
      reference_phone: referencePhone || null,
      anonymous_id: anonymousId,
      status: "submitted",
    }

    let inserted = await admin.from("scholarship_applications").insert(insertPayload).select("id, anonymous_id").maybeSingle()

    let usedMinimalInsert = false

    if (inserted.error) {
      const msg = inserted.error.message ?? ""
      const needsVideoMigration =
        submissionFormat === "video" &&
        isMissingColumnError(inserted.error) &&
        (msg.includes("submission_format") || msg.includes("video_url") || msg.includes("video_blob_url"))

      if (needsVideoMigration) {
        return NextResponse.json(
          {
            error:
              "Video nominations need one SQL migration: run lib/scholarships/sql/scholarship-applications-video-columns.sql in the Supabase SQL editor, then try again.",
          },
          { status: 503 },
        )
      }

      // Supabase/PostgREST reports absent columns as PGRST204 schema-cache errors,
      // while direct Postgres calls use 42703. Written nominations must continue
      // to save against either the legacy or current scholarship table.
      const missingColLegacy = isMissingColumnError(inserted.error)

      if (missingColLegacy) {
        if (submissionFormat === "video") {
          return NextResponse.json(
            {
              error:
                "Video nominations require the latest scholarship applications table (run Supabase migrations through lib/scholarships/sql/, including scholarship-applications-video-columns.sql).",
            },
            { status: 503 },
          )
        }
        usedMinimalInsert = true
        const fallback: Record<string, unknown> = {
          scholarship_id: scholarship.id,
          athlete_name: athleteName,
          athlete_school: athleteSchool || "Not provided",
          athlete_grad_year: athleteGradYear,
          athlete_weight_class: athleteWeightClass || null,
          athlete_email: athleteEmail || null,
          athlete_phone: athletePhone || null,
          nominator_name: nominatorName,
          nominator_relationship: nominatorRelationship,
          nominator_email: nominatorEmail,
          nominator_phone: nominatorPhone || null,
          written_statement: writtenStatementToStore.slice(0, 12000),
          wrestling_moment: null,
          reference_name: referenceName,
          reference_relationship: referenceRelationship,
          reference_email: referenceEmail,
          reference_phone: referencePhone || null,
          status: "submitted",
        }
        inserted = await admin.from("scholarship_applications").insert(fallback).select("id").maybeSingle()
      }
    }

    if (inserted.error) {
      if (inserted.error.code === "42P01" || inserted.error.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error:
              "Scholarship applications are not enabled yet — run scholarships DDL (scripts/supabase-scholarships-portal.sql) and PRD column patch under lib/scholarships/sql/.",
          },
          { status: 503 },
        )
      }
      console.error("[scholarships/apply]", inserted.error)
      return NextResponse.json({ error: "Could not save application." }, { status: 500 })
    }

    const anonUsed =
      !usedMinimalInsert && typeof inserted.data?.anonymous_id === "string"
        ? (inserted.data.anonymous_id as string)
        : null

    const insertedId = typeof inserted.data?.id === "string" ? inserted.data.id : null
    const managePath = insertedId ? scholarshipSubmissionEditPath(insertedId, nominatorEmail) : null
    const site = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://app.ncwrestlingunited.com"
    const manageUrl = managePath ? `${site.replace(/\/$/, "")}${managePath}` : null

    // Wait for notifications so serverless execution cannot end before email/SMS delivery.
    // Notification failures never invalidate an application that was already saved.
    await Promise.allSettled([
      sendScholarshipApplicationEmails({
        nominatorEmail,
        nominatorName,
        scholarshipName: scholarship.name,
        athleteName,
        anonymousId: anonUsed,
        applicationsCloseDate: formatUsDate(scholarship.applications_close_date ?? null),
        awardAnnouncementDate: formatUsDate(scholarship.award_announcement_date ?? null),
        adminNotifyEmail: null,
        submissionFormat,
        videoUrl,
        videoBlobUrl,
        manageUrl,
      }),
      sendScholarshipApplicationStaffSms({
        scholarshipName: scholarship.name,
        scholarshipSlug: scholarship.slug,
        athleteName,
        nominatorName,
      }),
    ])

    return NextResponse.json({ ok: true, id: insertedId, anonymous_id: anonUsed, manage_url: managePath })
  } catch (e) {
    console.error("[scholarships/apply]", e)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
