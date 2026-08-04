import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapAthleteToDb } from "@/lib/athlete-utils"
import { normalizePhoneForStorage } from "@/lib/phone-format"
import { unknownColumnFrom } from "@/lib/clubs/update-club"

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

// Contact fields that use specific DB columns (instagram lives in socialMedia JSONB, NOT as top-level column)
const CONTACT_FIELDS = new Set(["cell", "cell_number", "email", "contact_email", "email_address", "instagram", "instagram_handle", "instagram_username", "highlight_video_url", "highlightVideoUrl"])

// Only these columns exist in athletes table - never send instagram, etc. as top-level
// All self-editable fields from unified profile inline editors (InlineWeightEditor, InlineSchoolClubEditor, etc.)
// NC United Program (ncUnitedTeam) is admin-only: set in Admin → Athletes, read-only on unified profile.
const ALLOWED_UPDATE_COLUMNS = new Set([
  "cell", "cell_number", "phone", "contact_email", "contactEmail", "socialMedia", "social_media",
  "highlight_video_url", "updated_at", "bio", "bio_headline", "highschool", "wrestlingClub",
  // The club picker writes the relationship; wrestlingClub is kept in step so anything
  // still reading the text sees the same club during the migration.
  "wrestling_club_id", "secondary_wrestling_club_id",
  "weightclass", "weight_class",
  "academic_gpa", "academic_sat", "academic_act", "academic_summary", "academic_interest",
  "college_opens_experience", "achievements", "additional_achievements",
])

function isContactOnlyUpdate(updates: Record<string, unknown>): boolean {
  return Object.keys(updates).every((k) => CONTACT_FIELDS.has(k))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: athleteId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
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

    // Any logged-in user can edit; we track who made changes via audit log.

    for (const field of Object.keys(updates)) {
      if (RESTRICTED.has(norm(field))) {
        return NextResponse.json(
          { error: `Field "${field}" cannot be edited. Please contact admin.` },
          { status: 403 }
        )
      }
    }

    // Use the SAME column we read from (display uses cell || cell_number || phone)
    const athleteKeys = Object.keys(athlete)
    const hasContactEmail = athleteKeys.includes("contact_email")
    const hasContactEmailCamel = athleteKeys.includes("contactEmail")
    const phoneCol =
      athleteKeys.includes("cell_number") ? "cell_number"
      : athleteKeys.includes("phone") ? "phone"
      : athleteKeys.includes("cell") ? "cell"
      : "phone"
    const emailCol = hasContactEmail ? "contact_email" : hasContactEmailCamel ? "contactEmail" : "contact_email"

    let updatePayload: Record<string, unknown> = {}
    const payloadKeys: string[] = []

    // Contact-only updates: use actual DB column names
    if (isContactOnlyUpdate(updates)) {
      const toNull = (v: unknown) => (v === "" || v === undefined ? null : v)
      if (updates.cell !== undefined || updates.cell_number !== undefined) {
        const val = toNull(updates.cell ?? updates.cell_number)
        updatePayload[phoneCol] = val
        payloadKeys.push(phoneCol)
      }
      if (updates.email !== undefined || updates.contact_email !== undefined || updates.email_address !== undefined) {
        const val = toNull(updates.email ?? updates.contact_email ?? updates.email_address)
        updatePayload[emailCol] = val
        payloadKeys.push(emailCol)
      }
      if (updates.instagram !== undefined || updates.instagram_handle !== undefined || updates.instagram_username !== undefined) {
        const val = toNull(updates.instagram ?? updates.instagram_handle ?? updates.instagram_username)
        const raw = athlete.socialMedia ?? athlete.social_media
        const current = typeof raw === "object" && raw !== null ? raw : (typeof raw === "string" ? (() => { try { return JSON.parse(raw) } catch { return {} } })() : {})
        const socialCol = athleteKeys.includes("social_media") ? "social_media" : "socialMedia"
        updatePayload[socialCol] = { ...current, instagram: val }
        payloadKeys.push(socialCol)
      }
      if (updates.highlight_video_url !== undefined || updates.highlightVideoUrl !== undefined) {
        const val = toNull(updates.highlight_video_url ?? updates.highlightVideoUrl)
        updatePayload.highlight_video_url = val
        payloadKeys.push("highlight_video_url")
      }
    }

    // Non-contact updates: use mapAthleteToDb
    if (!isContactOnlyUpdate(updates)) {
      const merged = { ...athlete }
      const toAthleteKey: Record<string, string> = {
        high_school: "highschool", wrestlingclub: "wrestlingClub", cell: "phone", cell_number: "phone",
        email: "contactEmail", contact_email: "contactEmail", email_address: "contactEmail",
        instagram_handle: "instagram", instagram_username: "instagram",
        highlightVideoUrl: "highlight_video_url", additionalAchievements: "additional_achievements",
        academicGPA: "academic_gpa", academicGpa: "academic_gpa", academicSAT: "academic_sat", academicSat: "academic_sat",
        academicACT: "academic_act", academicAct: "academic_act", academicSummary: "academic_summary",
        academicInterest: "academic_interest",
      }
      for (const [key, val] of Object.entries(updates)) {
        if (val === undefined) continue
        merged[toAthleteKey[key] ?? key] = val
      }
      const dbData = await mapAthleteToDb(merged)
      const keyMap: Record<string, string> = {
        high_school: "highschool", wrestlingclub: "wrestlingClub", wrestlingClub: "wrestlingClub",
        cell: "phone", cell_number: "phone", email: "contactEmail", contact_email: "contactEmail", email_address: "contactEmail",
        instagram_handle: "socialMedia", instagram_username: "socialMedia",
        highlightVideoUrl: "highlight_video_url", additionalAchievements: "additional_achievements",
        academicGPA: "academic_gpa", academicGpa: "academic_gpa", academicSAT: "academic_sat", academicSat: "academic_sat",
        academicACT: "academic_act", academicAct: "academic_act", academicSummary: "academic_summary",
        academicInterest: "academic_interest",
      }
      for (const key of Object.keys(updates)) {
        if (CONTACT_FIELDS.has(key)) continue
        const dbKey = keyMap[key] ?? key
        const v = dbKey in dbData ? dbData[dbKey] : updates[key]
        if (v !== undefined) {
          updatePayload[dbKey] = v === "" ? null : v
          payloadKeys.push(dbKey)
        }
      }
      // Merge contact fields for mixed updates (e.g. contact + bio)
      if (updates.cell !== undefined || updates.cell_number !== undefined) {
        const val = updates.cell ?? updates.cell_number
        updatePayload[phoneCol] = val === "" ? null : normalizePhoneForStorage(val)
        if (!payloadKeys.includes(phoneCol)) payloadKeys.push(phoneCol)
      }
      if (updates.email !== undefined || updates.contact_email !== undefined || updates.email_address !== undefined) {
        const val = updates.email ?? updates.contact_email ?? updates.email_address
        updatePayload[emailCol] = val === "" ? null : val
        if (!payloadKeys.includes(emailCol)) payloadKeys.push(emailCol)
      }
      if (updates.instagram !== undefined || updates.instagram_handle !== undefined || updates.instagram_username !== undefined) {
        const val = updates.instagram ?? updates.instagram_handle ?? updates.instagram_username
        const raw = athlete.socialMedia ?? athlete.social_media
        const current = typeof raw === "object" && raw !== null ? raw : (typeof raw === "string" ? (() => { try { return JSON.parse(raw) } catch { return {} } })() : {})
        const socialCol = athleteKeys.includes("social_media") ? "social_media" : "socialMedia"
        updatePayload[socialCol] = { ...current, instagram: val === "" ? null : val }
        if (!payloadKeys.includes(socialCol)) payloadKeys.push(socialCol)
      }
      if (updates.highlight_video_url !== undefined || updates.highlightVideoUrl !== undefined) {
        const val = updates.highlight_video_url ?? updates.highlightVideoUrl
        updatePayload.highlight_video_url = val === "" ? null : val
        if (!payloadKeys.includes("highlight_video_url")) payloadKeys.push("highlight_video_url")
      }
    }

    if (payloadKeys.length === 0) {
      return NextResponse.json({ error: "No valid changes to apply" }, { status: 400 })
    }

    updatePayload.updated_at = new Date().toISOString()

    // Only send columns that exist on this row (query-driven) and are allowed
    const athleteColumnSet = new Set(athleteKeys)
    const alwaysAllow = new Set(["bio", "bio_headline"]) // Known columns; include even if not in sample row
    const filteredPayload: Record<string, unknown> = {}
    for (const k of Object.keys(updatePayload)) {
      const inAllowed = ALLOWED_UPDATE_COLUMNS.has(k)
      const inRowOrAlways = athleteColumnSet.has(k) || alwaysAllow.has(k)
      if (inAllowed && inRowOrAlways) filteredPayload[k] = updatePayload[k]
    }
    if (Object.keys(filteredPayload).length === 0) {
      return NextResponse.json({ error: "No valid changes to apply" }, { status: 400 })
    }

    let updatedAthlete: any
    let updateError: { message?: string } | null = null

    // Drop any column this database does not have yet and retry. wrestling_club_id ships
    // with the club picker but only exists after its migration runs, and one unknown
    // column rejects the whole update — which would fail every profile save, not just the
    // club. Losing that one field is survivable; losing the save is not.
    let attempt: Record<string, unknown> = { ...filteredPayload }
    for (let i = 0; i < 4; i++) {
      const result = await adminSupabase.from("athletes").update(attempt).eq("id", athleteId).select().single()
      updatedAthlete = result.data
      updateError = result.error
      if (!result.error) break
      const missing = unknownColumnFrom(result.error as { code?: string; message?: string })
      if (!missing || !(missing in attempt)) break
      delete attempt[missing]
      console.warn(`[athletes/self-edit] dropping unknown column "${missing}" — run the pending migration`)
    }

    // Fallback: try cell_number, then phone, if first update failed
    if (updateError) {
      const val = filteredPayload.phone ?? filteredPayload.cell_number ?? filteredPayload.cell
      if (val != null) {
        for (const col of ["cell_number", "phone", "cell"]) {
          if (col === phoneCol) continue
          const alt = { ...filteredPayload }
          delete alt.phone
          delete alt.cell_number
          delete alt.cell
          alt[col] = val
          const retry = await adminSupabase.from("athletes").update(alt).eq("id", athleteId).select().single()
          if (!retry.error) {
            updatedAthlete = retry.data
            updateError = null
            break
          }
        }
      }
    }
    if (updateError) {
      const alt: Record<string, unknown> = { ...filteredPayload }
      let changed = false
      if (emailCol === "contactEmail" && "contactEmail" in alt) {
        alt.contact_email = alt.contactEmail
        delete alt.contactEmail
        changed = true
      } else if (emailCol === "contact_email" && "contact_email" in alt) {
        alt.contactEmail = alt.contact_email
        delete alt.contact_email
        changed = true
      }
      if (changed) {
        const retry = await adminSupabase.from("athletes").update(alt).eq("id", athleteId).select().single()
        if (!retry.error) {
          updatedAthlete = retry.data
          updateError = null
        }
      }
    }

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
            old_value: String(athlete[field_name] ?? athlete[field_name === "socialMedia" ? "social_media" : field_name] ?? ""),
            new_value: String((filteredPayload[field_name] ?? updatePayload[field_name]) ?? ""),
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
