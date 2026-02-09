import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { upsertCollegeDivisionMapping } from "@/lib/upsert-college-division-mapping"
import { normalizeToCanonicalFull } from "@/lib/division-display"

/**
 * PATCH: Update an athlete's division (admin only). Also upserts college_division_mappings
 * for that athlete's college so lookups stay correct.
 * Body: { division: string } (e.g. "NCAA Division I", "NCAA Division III")
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: athleteId } = await params
    if (!athleteId) {
      return NextResponse.json({ error: "Athlete ID required" }, { status: 400 })
    }

    const body = await request.json()
    const divisionRaw = (body?.division ?? "").toString().trim()
    const division = normalizeToCanonicalFull(divisionRaw) || divisionRaw
    if (!division) {
      return NextResponse.json({ error: "division required" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    const { data: athlete, error: fetchErr } = await adminSupabase
      .from("athletes")
      .select("id, college")
      .eq("id", athleteId)
      .single()
    if (fetchErr || !athlete) {
      return NextResponse.json({ error: "Athlete not found" }, { status: 404 })
    }

    const { error: updateErr } = await adminSupabase
      .from("athletes")
      .update({ division })
      .eq("id", athleteId)
    if (updateErr) {
      console.error("[admin athletes division] update error:", updateErr)
      return NextResponse.json({ error: "Failed to update athlete division" }, { status: 500 })
    }

    if (athlete.college) {
      try {
        await upsertCollegeDivisionMapping(adminSupabase, athlete.college, division)
      } catch (e) {
        console.warn("[admin athletes division] upsert mapping warn:", e)
      }
    }

    return NextResponse.json({ success: true, division })
  } catch (e) {
    console.error("[admin athletes division] error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
