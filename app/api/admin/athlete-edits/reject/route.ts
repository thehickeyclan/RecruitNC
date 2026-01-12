import { NextRequest, NextResponse } from "next/server"
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { athleteId, auditLogIds, adminNotes, revertChanges } = body

    if (!athleteId || !Array.isArray(auditLogIds) || auditLogIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: athleteId and auditLogIds" },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get the audit log entries to revert
    const { data: auditEntries, error: fetchError } = await adminSupabase
      .from("athlete_audit_log")
      .select("*")
      .in("id", auditLogIds)
      .eq("change_type", "athlete_edit")

    if (fetchError || !auditEntries || auditEntries.length === 0) {
      return NextResponse.json({ error: "Audit log entries not found" }, { status: 404 })
    }

    // Get current athlete data
    const { data: athlete, error: athleteError } = await adminSupabase
      .from("athletes")
      .select("*")
      .eq("id", athleteId)
      .single()

    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    // Revert changes if requested
    if (revertChanges) {
      const revertData: Record<string, any> = {}
      
      for (const entry of auditEntries) {
        // Revert to old value
        revertData[entry.field_name] = entry.old_value
      }

      revertData.last_edited_by = user.id
      revertData.last_edited_at = new Date().toISOString()
      revertData.updated_at = new Date().toISOString()

      const { error: revertError } = await adminSupabase
        .from("athletes")
        .update(revertData)
        .eq("id", athleteId)

      if (revertError) {
        console.error("Error reverting changes:", revertError)
        return NextResponse.json({ error: "Failed to revert changes" }, { status: 500 })
      }
    }

    // Mark audit log entries as rejected
    const rejectionEntries = auditEntries.map((entry) => ({
      athlete_id: athleteId,
      user_id: entry.user_id,
      field_name: entry.field_name,
      old_value: revertChanges ? entry.new_value : entry.old_value,
      new_value: revertChanges ? entry.old_value : entry.new_value,
      change_type: "admin_reject",
      admin_notes: adminNotes || `Rejected by admin. ${revertChanges ? "Changes reverted." : "Changes kept but marked as rejected."}`,
      created_at: new Date().toISOString(),
    }))

    const { error: logError } = await adminSupabase
      .from("athlete_audit_log")
      .insert(rejectionEntries)

    if (logError) {
      console.error("Error creating rejection audit log:", logError)
    }

    return NextResponse.json({
      success: true,
      message: revertChanges 
        ? "Changes rejected and reverted successfully" 
        : "Changes marked as rejected",
      reverted: revertChanges,
    })
  } catch (error) {
    console.error("Error in reject athlete edits API:", error)
    return NextResponse.json(
      { error: "Internal server error: " + (error as Error).message },
      { status: 500 }
    )
  }
}

