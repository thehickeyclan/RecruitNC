import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAthletesColumnNames, filterPayloadToSchema } from "@/lib/athletes-schema"
import { findExistingAthlete } from "@/lib/athlete-duplicate-check"

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
        graduationYear,
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
      location: formData.location || null,
      wrestlingClub: formData.wrestlingClub || formData.club || null,
      bio: formData.bio || null,
      achievements: formData.achievements ? [formData.achievements] : [],
      photourl: formData.photoUrl || null,
      contactEmail: formData.email || null,
      phone: formData.phone || null,
      claimed_by_user_id: user.id,
      claimed_at: now,
      profile_verified: true,
      recruiting_status: "Uncommitted",
      is_prospect: true,
      updated_at: now,
    }
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

    // Link athlete to user's profile (admin client avoids RLS blocking)
    await adminSupabase
      .from("user_profiles")
      .update({ athlete_id: athlete.id, athlete_name: athlete.name })
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
