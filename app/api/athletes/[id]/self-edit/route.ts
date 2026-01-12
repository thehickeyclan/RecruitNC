import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Fields that athletes CAN edit (auto-approve)
const EDITABLE_FIELDS = [
  "bio",
  "bio_headline",
  "highschool",
  "high_school",
  "wrestlingclub",
  "wrestlingClub",
  "cell",
  "cell_number",
  "phone",
  "instagram",
  "instagram_handle",
  "instagram_username",
  "academic_gpa",
  "academic_sat",
  "academic_act",
  "achievements",
  "additional_achievements",
  "college_opens_experience",
  "nationally_ranked_wins",
  "prospect_ranking",
]

// Fields that athletes CANNOT edit (restricted)
const RESTRICTED_FIELDS = [
  "name",
  "matches",
  "nhsca_results",
  "nhsca_2023_record",
  "nhsca_2024_record",
  "nhsca_2025_record",
  "nhsca_2023_placement",
  "nhsca_2024_placement",
  "nhsca_2025_placement",
  "super32_results",
  "super_32_2023_record",
  "super_32_2024_record",
  "super_32_2025_record",
  "super_32_2023_placement",
  "super_32_2024_placement",
  "super_32_2025_placement",
  "career_record",
  "season_record",
]

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const athleteId = params.id
    const body = await request.json()
    const updates = body.updates || {}
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null

    // Verify athlete exists and get current data
    const adminSupabase = createAdminClient()
    const { data: athlete, error: athleteError } = await adminSupabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Verify user owns this athlete profile (check claimed_by_user_id or allow if not claimed)
    // For now, allow any logged-in user to edit (you may want to add ownership verification)
    // TODO: Add ownership verification if you have a claimed_by_user_id field

    // Validate and filter updates - only allow editable fields
    const allowedUpdates: Record<string, any> = {}
    const auditLogEntries: Array<{
      field_name: string
      old_value: string | null
      new_value: string | null
    }> = []

    for (const [field, newValue] of Object.entries(updates)) {
      // Normalize field names
      const normalizedField = field.toLowerCase().replace(/_/g, "")

      // Check if field is restricted
      const isRestricted = RESTRICTED_FIELDS.some(
        (restricted) => restricted.toLowerCase().replace(/_/g, "") === normalizedField
      )

      if (isRestricted) {
        return NextResponse.json(
          { error: `Field "${field}" cannot be edited by athletes. Please contact admin.` },
          { status: 403 }
        )
      }

      // Check if field is editable
      const isEditable = EDITABLE_FIELDS.some(
        (editable) => editable.toLowerCase().replace(/_/g, "") === normalizedField
      )

      if (!isEditable) {
        // Skip unknown fields
        continue
      }

      // Get old value
      const oldValue = athlete[field] || athlete[field.toLowerCase()] || null
      const normalizedNewValue = newValue !== null && newValue !== undefined ? String(newValue) : null

      // Only log if value actually changed
      if (oldValue !== normalizedNewValue) {
        allowedUpdates[field] = normalizedNewValue
        auditLogEntries.push({
          field_name: field,
          old_value: oldValue ? String(oldValue) : null,
          new_value: normalizedNewValue,
        })
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid changes to apply" }, { status: 400 })
    }

    // Update athlete record
    const updateData = {
      ...allowedUpdates,
      last_edited_by: user.id,
      last_edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: updatedAthlete, error: updateError } = await adminSupabase
      .from("athletes")
      .update(updateData)
      .eq("id", athleteId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating athlete:", updateError)
      return NextResponse.json({ error: "Failed to update athlete" }, { status: 500 })
    }

    // Create audit log entries
    if (auditLogEntries.length > 0) {
      const auditLogData = auditLogEntries.map((entry) => ({
        athlete_id: athleteId,
        user_id: user.id,
        field_name: entry.field_name,
        old_value: entry.old_value,
        new_value: entry.new_value,
        change_type: "athlete_edit",
        ip_address: ipAddress,
        created_at: new Date().toISOString(),
      }))

      const { error: auditError } = await adminSupabase
        .from("athlete_audit_log")
        .insert(auditLogData)

      if (auditError) {
        console.error("Error creating audit log:", auditError)
        // Don't fail the request if audit log fails, but log it
      }
    }

    // TODO: Send notification to admins about the edit
    // This could be an email, in-app notification, or webhook

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      athlete: updatedAthlete,
      changes: auditLogEntries.length,
    })
  } catch (error) {
    console.error("Error in athlete self-edit API:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    )
  }
}

