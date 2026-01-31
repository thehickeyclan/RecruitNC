import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
      "location",
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

    // Optional: link new profile to a ranked spot (e.g. from Class of 2028 "New profile" link)
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
      bio: formData.bio || null,
      achievements: formData.achievements ? [formData.achievements] : [],
      photourl: formData.photoUrl || null,
      contact_email: formData.email || null,
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

    const adminSupabase = createAdminClient()
    const { data: athlete, error } = await adminSupabase
      .from("athletes")
      .insert(insertPayload)
      .select("id, name")
      .single()

    if (error) {
      console.error("[Create Profile] Insert error:", error)
      const details = error.message || (error as Error).toString()
      return NextResponse.json(
        { error: "Failed to create profile", details },
        { status: 500 },
      )
    }

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
