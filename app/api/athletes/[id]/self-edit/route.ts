import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapAthleteToDb } from "@/lib/athlete-utils"

// Normalize for comparison: lowercase, no underscores (so careerRecord and career_record both match)
const norm = (s: string) => s.toLowerCase().replace(/_/g, "")

const RESTRICTED_RAW = [
  "name", "matches",
  "nhsca_results", "nhsca_2023_record", "nhsca_2024_record", "nhsca_2025_record",
  "nhsca_2023_placement", "nhsca_2024_placement", "nhsca_2025_placement",
  "nhsca_results_text",
  "super32_results", "super_32_2023_record", "super_32_2024_record", "super_32_2025_record",
  "super_32_2023_placement", "super_32_2024_placement", "super_32_2025_placement",
  "super32_results_text",
  "career_record", "season_record", "careerRecord",
  "state_championships",
  "ultimate_club_duals_2025_record", "ultimate_club_duals_2024_record",
]
const RESTRICTED = new Set(RESTRICTED_RAW.map(norm))

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const athleteId = params.id
    const body = await request.json()
    const updates = body.updates || {}
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null

    const adminSupabase = createAdminClient()
    const { data: athlete, error: athleteError } = await adminSupabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    for (const field of Object.keys(updates)) {
      if (RESTRICTED.has(norm(field))) {
        return NextResponse.json(
          { error: `Field "${field}" cannot be edited. Please contact admin.` },
          { status: 403 }
        )
      }
    }

    const merged = { ...athlete }
    const toAthleteKey: Record<string, string> = {
      high_school: "highschool", wrestlingclub: "wrestlingClub", cell: "phone", cell_number: "phone",
      email: "contactEmail", contact_email: "contactEmail", email_address: "contactEmail",
      instagram_handle: "instagram", instagram_username: "instagram",
      highlightVideoUrl: "highlight_video_url", additionalAchievements: "additional_achievements",
      academicGPA: "academic_gpa", academicGpa: "academic_gpa", academicSAT: "academic_sat", academicSat: "academic_sat",
      academicACT: "academic_act", academicAct: "academic_act", academicSummary: "academic_summary",
    }
    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined) continue
      merged[toAthleteKey[key] ?? key] = val
    }

    const dbData = await mapAthleteToDb(merged)

    const keyMap: Record<string, string> = {
      high_school: "highschool", wrestlingclub: "wrestlingClub", wrestlingClub: "wrestlingClub",
      cell: "phone", cell_number: "phone", email: "contactEmail", contact_email: "contactEmail", email_address: "contactEmail",
      instagram_handle: "instagram", instagram_username: "instagram",
      highlightVideoUrl: "highlight_video_url", additionalAchievements: "additional_achievements",
      academicGPA: "academic_gpa", academicGpa: "academic_gpa", academicSAT: "academic_sat", academicSat: "academic_sat",
      academicACT: "academic_act", academicAct: "academic_act", academicSummary: "academic_summary",
    }

    const updatePayload: Record<string, unknown> = {}
    for (const key of Object.keys(updates)) {
      const dbKey = keyMap[key] ?? key
      const v = dbKey in dbData ? dbData[dbKey] : updates[key]
      if (v !== undefined) {
        updatePayload[dbKey] = v === "" ? null : v
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No valid changes to apply" }, { status: 400 })
    }

    updatePayload.updated_at = new Date().toISOString()
    const payloadKeys = Object.keys(updatePayload).filter((k) => k !== "updated_at")

    const { data: updatedAthlete, error: updateError } = await adminSupabase
      .from("athletes")
      .update(updatePayload)
      .eq("id", athleteId)
      .select()
      .single()

    if (updateError) {
      console.error("[self-edit] Update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update athlete", details: updateError.message },
        { status: 500 }
      )
    }

    if (payloadKeys.length > 0) {
      try {
        await adminSupabase.from("athlete_audit_log").insert(
          payloadKeys.map((field_name) => ({
            athlete_id: athleteId,
            user_id: user.id,
            field_name,
            old_value: String(athlete[field_name] ?? ""),
            new_value: String(updatePayload[field_name] ?? ""),
            change_type: "athlete_edit",
            ip_address: ipAddress,
            created_at: new Date().toISOString(),
          }))
        )
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      athlete: updatedAthlete,
      changes: payloadKeys.length,
    })
  } catch (error) {
    console.error("[self-edit] Error:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    )
  }
}
