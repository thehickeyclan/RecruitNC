import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { parseIntake, staffTextFor } from "@/lib/commitments/intake"
import { approvalUrl } from "@/lib/commitments/approval-link"
import { sendSms, toE164 } from "@/lib/sms"

export const dynamic = "force-dynamic"

/**
 * A commitment report: saved, then texted to Matt with a link that opens it for approval.
 *
 * Written with the service role. The route this replaces used the anonymous browser client, which
 * the table refuses, so every report sent since the form was rebuilt was lost with a 500 - one of
 * them from a college coach reporting his own recruit (26 October 2026). Nothing is published here:
 * a report reaches a profile only when Matt approves it (lib/commitments/apply.ts).
 */

/** Matt's phone. The staff numbers configured for other alerts come first. */
const DEFAULT_STAFF_PHONE = "6316625409"

function staffPhones(): string[] {
  const raw =
    process.env.COMMITMENT_SMS_TO?.trim() ||
    process.env.RECRUITNC_STAFF_ALERT_SMS_TO?.trim() ||
    process.env.RECRUITNC_BLUE_NEW_SUB_SMS_TO?.trim() ||
    DEFAULT_STAFF_PHONE
  return raw
    .split(",")
    .map((p) => toE164(p.trim()))
    .filter((p): p is string => Boolean(p))
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "That did not go through. Please try again." }, { status: 400 })
  // A field no person can see: a bot fills it, a person never does.
  if (String(body.website ?? "").trim()) return NextResponse.json({ success: true })

  const parsed = parseIntake(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const input = parsed.value

  const admin = createAdminClient()
  const userId = await resolveRequestUserId(request).catch(() => null)

  type ProfileRow = { id: string; name: string; highschool: string | null; graduationyear: number | null; gender: string | null; wrestlingClub: string | null; firstName: string | null; lastName: string | null; weightclass: string | null }
  let athlete: ProfileRow | null = null
  if (input.athleteId) {
    const { data } = await admin
      .from("athletes")
      .select('id, name, highschool, graduationyear, gender, "wrestlingClub", "firstName", "lastName", weightclass')
      .eq("id", input.athleteId)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: "That profile could not be found. Search for the wrestler again." }, { status: 400 })
    athlete = data as unknown as ProfileRow
  }

  type CollegeRow = { id: string; name: string; division: string | null }
  let college: CollegeRow | null = null
  if (input.collegeId) {
    const { data } = await admin.from("colleges").select("id, name, division").eq("id", input.collegeId).maybeSingle()
    if (!data) return NextResponse.json({ error: "Choose the college again." }, { status: 400 })
    college = data as unknown as CollegeRow
  }

  const name = athlete?.name ?? input.athleteName ?? ""
  const [first, ...rest] = name.split(" ")
  const now = new Date().toISOString()
  const { data: saved, error } = await admin
    .from("commitment_submissions")
    .insert({
      first_name: athlete?.firstName || first,
      last_name: athlete?.lastName || rest.join(" "),
      graduation_year: athlete?.graduationyear ?? input.graduationYear,
      gender: athlete?.gender ?? input.gender,
      weight_class: athlete?.weightclass ?? null,
      high_school: athlete?.highschool ?? input.highSchool,
      club: athlete?.wrestlingClub ?? null,
      athlete_id: athlete?.id ?? null,
      college: college?.name ?? input.collegeName,
      college_id: college?.id ?? null,
      division: college?.division ?? null,
      commitment_date: input.commitmentDate,
      commitment_announcement_url: input.announcementUrl,
      college_weight_class: input.collegeWeightClass,
      intended_major: input.intendedMajor,
      commit_picture_url: input.photoUrl,
      submitter_name: input.submitterName,
      submitter_role: input.submitterRole,
      submitter_contact: input.submitterContact,
      submitter_user_id: userId,
      entities: "[]",
      status: "pending",
      submitted_at: now,
    })
    .select("id")
    .single()

  if (error || !saved) {
    console.error("[submit-commitment]", error?.message)
    return NextResponse.json({ error: "That did not go through. Please try again, or email info@ncwrestlingunited.com." }, { status: 500 })
  }

  const text = staffTextFor({
    athleteName: name,
    athleteDetail: [athlete?.highschool ?? input.highSchool, (athlete?.graduationyear ?? input.graduationYear) ? `'${String(athlete?.graduationyear ?? input.graduationYear).slice(2)}` : null]
      .filter(Boolean)
      .join(" "),
    college: college?.name ?? input.collegeName ?? "",
    role: input.submitterRole,
    submitterName: input.submitterName,
    hasProfile: Boolean(athlete),
    url: approvalUrl(saved.id),
  })
  // A failed text must never fail the report: it is saved, and it is on /admin/commitment-submissions.
  let texted = 0
  for (const phone of staffPhones()) {
    try {
      if (await sendSms(phone, text)) texted++
    } catch (e) {
      console.error("[submit-commitment] sms", e instanceof Error ? e.message : e)
    }
  }
  console.info(`[submit-commitment] ${saved.id} saved; texted ${texted}`)

  return NextResponse.json({ success: true, id: saved.id })
}
