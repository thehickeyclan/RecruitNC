import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { auditIpFrom, recordAthleteEvent } from "@/lib/athlete-audit"
import { notifyProfileClaim } from "@/lib/profile-claim-notify"

/**
 * Connect a signed-in account to an existing athlete.
 *
 * Two relationships, because they are not the same thing and were being conflated:
 *
 *   self   — this is my profile. Sets claimed_by_user_id, one owner per athlete.
 *   parent — this is my child. Writes parent_athlete_links, which is many-to-many, so a
 *            parent with three wrestlers can link all three.
 *
 * Before this, a parent had only the "self" path, which meant claiming a child made the
 * parent *be* that child on their account — and blocked them from claiming a second one,
 * since user_profiles.athlete_id holds a single value.
 *
 * POST body: { athleteId: string, relationship?: "self" | "parent" }
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
    // Defaults to "self" so existing callers that predate the parent option keep working.
    const relationship = body?.relationship === "parent" ? "parent" : "self"

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

    if (relationship === "parent") {
      // Repeatable by design: one row per child, and re-linking the same child is a no-op.
      const { error: linkError } = await adminSupabase
        .from("parent_athlete_links")
        .upsert({ user_id: user.id, athlete_id: athleteId }, { onConflict: "user_id,athlete_id", ignoreDuplicates: true })

      if (linkError) {
        return NextResponse.json({ error: "Failed to link", details: linkError.message }, { status: 500 })
      }

      await recordAthleteEvent(adminSupabase, {
        athleteId,
        userId: user.id,
        changeType: "parent_linked",
        detail: `linked as parent by ${user.id}${user.email ? ` (${user.email})` : ""}`,
        ipAddress: auditIpFrom(request),
      })

      await notifyProfileClaim({
        athleteId,
        athleteName: String(athlete.name ?? "Athlete"),
        relationship: "parent",
        claimantName: null,
        claimantEmail: user.email ?? null,
        previousOwnerUserId: null,
      })

      return NextResponse.json({
        success: true,
        relationship,
        athleteId: athlete.id,
        athleteName: athlete.name,
        message: `${athlete.name} is now linked to your account. You can add another wrestler any time.`,
      })
    }

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

    // A claim is immediate and unreviewed, so staff hear about it. Never awaited into the
    // response path in a way that could fail the claim — notifyProfileClaim swallows its own
    // errors.
    await notifyProfileClaim({
      athleteId,
      athleteName: String(athlete.name ?? "Athlete"),
      relationship: "self",
      claimantName: null,
      claimantEmail: user.email ?? null,
      previousOwnerUserId: previousOwner,
    })

    return NextResponse.json({
      success: true,
      relationship,
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
