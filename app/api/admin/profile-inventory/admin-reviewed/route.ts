import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * PATCH: Toggle "Reviewed/Approved" checkbox for an athlete (admin only, backend only).
 * Body: { athleteId: string, checked: boolean }
 * Users always see profiles as live; this is for admin workflow tracking.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const athleteId = body?.athleteId
    const checked = Boolean(body?.checked)
    if (!athleteId || typeof athleteId !== "string") {
      return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from("athletes")
      .update({
        admin_reviewed: checked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", athleteId)

    if (error) {
      const missingColumn = /admin_reviewed|column/i.test(error.message)
      return NextResponse.json(
        {
          error: "Update failed",
          details: missingColumn
            ? "athletes.admin_reviewed column may not exist. Run: ALTER TABLE athletes ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN DEFAULT false;"
            : error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, checked })
  } catch (err) {
    console.error("[profile-inventory admin-reviewed] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
