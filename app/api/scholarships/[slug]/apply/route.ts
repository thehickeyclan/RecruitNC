import { NextRequest, NextResponse } from "next/server"

import { sendScholarshipApplicationEmails } from "@/lib/email/scholarship-application-email"
import { scholarshipApplicationsAreOpen } from "@/lib/scholarships/applications-open"
import { getScholarshipBySlug } from "@/lib/scholarships/public-queries"
import { countWords } from "@/lib/scholarships/word-count"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function truncate(s: string, max: number): string {
  return s.trim().slice(0, max)
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
  const athleteGradYear = Number(body.athlete_grad_year)
  const athleteWeightClass = truncate(String(body.athlete_weight_class ?? ""), 60)
  const athleteEmail = truncate(String(body.athlete_email ?? ""), 320)
  const athletePhone = truncate(String(body.athlete_phone ?? ""), 40)

  const nominatorName = truncate(String(body.nominator_name ?? ""), 200)
  const nominatorRelationship = truncate(String(body.nominator_relationship ?? ""), 120)
  const nominatorEmail = truncate(String(body.nominator_email ?? "").toLowerCase(), 320)
  const nominatorPhone = truncate(String(body.nominator_phone ?? ""), 40)

  const writtenStatement = String(body.written_statement ?? "").trim()
  const wrestlingMomentRaw = String(body.wrestling_moment ?? "").trim()
  const wrestlingMoment = wrestlingMomentRaw ? truncate(wrestlingMomentRaw, 8000) : null

  const referenceName = truncate(String(body.reference_name ?? ""), 200)
  const referenceRelationship = truncate(String(body.reference_relationship ?? ""), 120)
  const referenceEmail = truncate(String(body.reference_email ?? ""), 320)
  const referencePhone = truncate(String(body.reference_phone ?? ""), 40)

  if (athleteName.length < 3 || athleteSchool.length < 2) {
    return NextResponse.json({ error: "Athlete name and school are required." }, { status: 400 })
  }
  if (!Number.isFinite(athleteGradYear) || athleteGradYear < 2024 || athleteGradYear > 2040) {
    return NextResponse.json({ error: "Enter a valid graduation year." }, { status: 400 })
  }
  if (!athleteEmail || !EMAIL_RE.test(athleteEmail)) {
    return NextResponse.json({ error: "Athlete email is required." }, { status: 400 })
  }
  if (nominatorName.length < 3 || nominatorRelationship.length < 2) {
    return NextResponse.json({ error: "Nominator name and relationship are required." }, { status: 400 })
  }
  if (!nominatorEmail || !EMAIL_RE.test(nominatorEmail)) {
    return NextResponse.json({ error: "Nominator email is required." }, { status: 400 })
  }

  const wc = countWords(writtenStatement)
  if (wc < 300 || wc > 500) {
    return NextResponse.json({ error: `Written statement must be 300–500 words (yours: ${wc}).` }, { status: 400 })
  }

  if (wrestlingMoment) {
    const mw = countWords(wrestlingMoment)
    if (mw > 200) {
      return NextResponse.json({ error: `Wrestling moment must be at most 200 words (yours: ${mw}).` }, { status: 400 })
    }
  }

  try {
    const admin = createAdminClient()
    const { data: inserted, error } = await admin
      .from("scholarship_applications")
      .insert({
        scholarship_id: scholarship.id,
        athlete_name: athleteName,
        athlete_school: athleteSchool,
        athlete_grad_year: athleteGradYear,
        athlete_weight_class: athleteWeightClass || null,
        athlete_email: athleteEmail,
        athlete_phone: athletePhone || null,
        nominator_name: nominatorName,
        nominator_relationship: nominatorRelationship,
        nominator_email: nominatorEmail,
        nominator_phone: nominatorPhone || null,
        written_statement: writtenStatement.slice(0, 12000),
        wrestling_moment: wrestlingMoment,
        reference_name: referenceName || null,
        reference_relationship: referenceRelationship || null,
        reference_email: referenceEmail || null,
        reference_phone: referencePhone || null,
        status: "submitted",
      })
      .select("id")
      .maybeSingle()

    if (error) {
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Scholarship applications are not enabled yet — run scripts/supabase-scholarships-portal.sql in Supabase." },
          { status: 503 },
        )
      }
      console.error("[scholarships/apply]", error)
      return NextResponse.json({ error: "Could not save application." }, { status: 500 })
    }

    void sendScholarshipApplicationEmails({
      nominatorEmail,
      nominatorName,
      scholarshipName: scholarship.name,
      athleteName,
      adminNotifyEmail: null,
    })

    return NextResponse.json({ ok: true, id: inserted?.id })
  } catch (e) {
    console.error("[scholarships/apply]", e)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
