import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { auditIpFrom, recordAthleteEvent } from "@/lib/athlete-audit"

/**
 * After user confirmed "Yes, this is my profile", link them to the existing athlete.
 * POST body: { athleteId: string }
 */
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

    const body = await request.json()
    const athleteId = body?.athleteId
    if (!athleteId || typeof athleteId !== "string") {
      return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { data: athlete, error: fetchError } = await adminSupabase
      .from("athletes")
      .select("id, name, claimed_by_user_id")
      .eq("id", athleteId)
      .single()

    if (fetchError || !athlete) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const previousOwner = (athlete as { claimed_by_user_id?: string | null }).claimed_by_user_id ?? null

    const now = new Date().toISOString()
    await adminSupabase
      .from("athletes")
      .update({
        claimed_by_user_id: user.id,
        claimed_at: now,
        updated_at: now,
      })
      .eq("id", athleteId)

    // Use admin client so RLS on user_profiles cannot block linking; user identity already verified above
    const { data: updated, error: profileUpdateError } = await adminSupabase
      .from("user_profiles")
      .update({ athlete_id: athleteId })
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle()

    if (profileUpdateError) {
      console.error("[claim-existing] user_profiles update error:", profileUpdateError)
      return NextResponse.json(
        { error: "Failed to link profile", details: profileUpdateError.message },
        { status: 500 }
      )
    }
    if (!updated) {
      console.error("[claim-existing] No user_profiles row found for user:", user.id)
      return NextResponse.json(
        { error: "Account profile not found; please refresh and try again." },
        { status: 404 }
      )
    }

    // Ownership is the event most likely to be queried later, and it was recorded nowhere.
    await recordAthleteEvent(adminSupabase, {
      athleteId,
      userId: user.id,
      changeType: "profile_claimed",
      previousDetail: previousOwner ? `claimed by ${previousOwner}` : "unclaimed",
      detail: `claimed by ${user.id}${user.email ? ` (${user.email})` : ""}`,
      ipAddress: auditIpFrom(request),
    })

    return NextResponse.json({
      success: true,
      athleteId: athlete.id,
      athleteName: athlete.name,
      message: "You're now linked to this profile. You can view and edit it anytime.",
    })
  } catch (err) {
    console.error("[claim-existing] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}
