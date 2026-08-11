import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"
import { normalizePhoneForStorage } from "@/lib/phone-format"
import { auditIpFrom, recordAthleteEvent } from "@/lib/athlete-audit"

/** Stored as a bare handle. Athletes type "@name", a full URL, or just the name. */
function socialHandle(value: unknown): string | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const handle = raw
    .replace(/^https?:\/\/(www\.)?(instagram|twitter|x)\.com\//i, "")
    .replace(/[/?].*$/, "")
    .replace(/^@+/, "")
    .trim()
  return handle || null
}

/** Numeric academics, kept null rather than 0 when the athlete leaves them blank. */
function numberOrNull(value: unknown, min: number, max: number): number | null {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null
  return parsed
}

// Match athlete-utils mapAthleteToDb: admin uses contactEmail, phone (camelCase)
const ADD_COLUMNS_SQL = `
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS phone TEXT;
`

async function ensureCreateProfileColumns(supabase: ReturnType<typeof createAdminClient>) {
  await supabase.rpc("exec_sql", { sql_query: ADD_COLUMNS_SQL })
  await supabase.rpc("exec_sql", { sql: ADD_COLUMNS_SQL })
  await supabase.rpc("exec", { sql: ADD_COLUMNS_SQL })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.json()

    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "gender",
      "graduationYear",
      "weightClass",
      "highSchool",
    ]
    for (const field of requiredFields) {
      if (!formData[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 })
      }
    }

    const graduationyear = Number.parseInt(String(formData.graduationYear), 10)
    if (Number.isNaN(graduationyear)) {
      return NextResponse.json({ error: "Invalid graduation year" }, { status: 400 })
    }

    const athleteName = `${String(formData.firstName).trim()} ${String(formData.lastName).trim()}`
    const now = new Date().toISOString()

    const adminSupabase = createAdminClient()

    if (!formData.forceCreate) {
      const existing = await findExistingAthlete(adminSupabase, {
        name: athleteName,
        graduationYear: graduationyear,
        school: formData.highSchool || undefined,
      })
      if (existing) {
        const { data: existingRow } = await adminSupabase
          .from("athletes")
          .select("highschool, graduationyear")
          .eq("id", existing.id)
          .single()
        return NextResponse.json({
          success: true,
          existing: true,
          confirmRequired: true,
          athleteId: existing.id,
          athleteName: existing.name,
          highschool: (existingRow as any)?.highschool ?? formData.highSchool ?? "",
          graduationYear: graduationyear,
          message: "We found an existing profile. Please confirm it's yours before we link you.",
        })
      }
    }

    await ensureCreateProfileColumns(adminSupabase)

    const prospectRanking =
      formData.prospect_ranking != null && Number.isFinite(Number(formData.prospect_ranking))
        ? Math.min(30, Math.max(1, Number(formData.prospect_ranking)))
        : null

    const insertPayload: Record<string, unknown> = {
      name: athleteName,
      firstName: String(formData.firstName).trim(),
      lastName: String(formData.lastName).trim(),
      gender: formData.gender,
      graduationyear,
      weightclass: formData.weightClass || null,
      highschool: formData.highSchool || null,
      wrestlingClub: formData.wrestlingClub || formData.club || null,
      bio: formData.bio || null,
      // Achievements are no longer asked for here. One free-text box produced a single blob
      // per athlete that nothing could read back as individual placings; they are entered
      // one at a time on the profile instead.
      photourl: formData.photoUrl || null,
      academic_gpa: numberOrNull(formData.academicGpa, 0, 5),
      academic_sat: numberOrNull(formData.academicSat, 400, 1600),
      academic_act: numberOrNull(formData.academicAct, 1, 36),
      academic_interest: formData.academicInterest || null,
      highlight_video_url: String(formData.highlightVideoUrl ?? "").trim() || null,
      contactEmail: formData.email || null,
      phone: formData.phone ? normalizePhoneForStorage(formData.phone) : null,
      claimed_by_user_id: user.id,
      claimed_at: now,
      profile_verified: true,
      recruiting_status: "Uncommitted",
      is_prospect: true,
      updated_at: now,
    }

    // socialMedia is a JSONB blob, not columns. Only set it when there is something to put
    // in it, so an athlete who skips both fields keeps a NULL rather than an empty object.
    const socials: Record<string, string> = {}
    const instagram = socialHandle(formData.instagram)
    const twitter = socialHandle(formData.twitter)
    if (instagram) socials.instagram = instagram
    if (twitter) socials.twitter = twitter
    if (Object.keys(socials).length > 0) insertPayload.socialMedia = socials
    if (prospectRanking != null) {
      insertPayload.prospect_ranking = prospectRanking
    }

    const columns = await getAthletesColumnNames(adminSupabase)
    const filteredPayload = filterPayloadToSchema(insertPayload, columns)

    const { data: athlete, error } = await adminSupabase
      .from("athletes")
      .insert(filteredPayload)
      .select("id, name")
      .single()

    if (error) {
      const details = error.message || (error as Error).toString()
      const needsColumns = /contact_email|phone|column/i.test(details)
      return NextResponse.json(
        {
          error: "Failed to create profile",
          details: needsColumns
            ? `${details} Run POST /api/run-script/add-create-profile-columns or add contact_email, phone in Supabase SQL Editor, then retry.`
            : details,
        },
        { status: 500 },
      )
    }

    // First row in this athlete's history, so the trail starts where the profile does.
    await recordAthleteEvent(adminSupabase, {
      athleteId: athlete.id,
      userId: user.id,
      changeType: "profile_created",
      detail: `created by ${user.id}${user.email ? ` (${user.email})` : ""}`,
      ipAddress: auditIpFrom(request),
    })

    // Link athlete to user's profile (admin client avoids RLS blocking)
    await adminSupabase
      .from("user_profiles")
      .update({ athlete_id: athlete.id })
      .eq("user_id", user.id)

    return NextResponse.json({
      success: true,
      athleteId: athlete.id,
      athleteName: athlete.name,
      message: "Profile created and live. You can edit it anytime.",
    })
  } catch (err) {
    console.error("[Create Profile] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
