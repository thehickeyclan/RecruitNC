import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { auditIpFrom, recordAthleteEvent } from "@/lib/athlete-audit"
import { claimProfile } from "@/lib/profile-claim"

export const dynamic = "force-dynamic"

/**
 * POST: link the signed-in account to a wrestler as their parent, from the profile setup screen.
 * Body: { athleteId: string; signedName?: string }.
 *
 * Goes through claimProfile, the one claim path the profile page and the app already use, so it
 * leaves the same consent record and gets the same review flags. It used to insert the link with
 * the user's own client under a "user_id = auth.uid()" policy - no signature, no record - and a
 * parent link is what unlocks editing a minor's contact details, the coach-view panel and the
 * fundraising wallet. Five days of links from this screen left nothing to review.
 *
 * This screen asks for no typed signature, so the account's own name stands in for it and the
 * link is flagged as unsigned. Flagged, not refused - the same rule as every other claim.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: { athleteId?: string; signedName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const athleteId = body?.athleteId
  if (!athleteId || typeof athleteId !== "string") {
    return NextResponse.json({ error: "athleteId is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("full_name").eq("user_id", user.id).maybeSingle()
  const typed = String(body.signedName ?? "").trim()
  const accountName = String(me?.full_name ?? "").trim()
  const signedName = typed || accountName
  if (!signedName) {
    return NextResponse.json(
      { error: "Add your full name to your profile first, then link your wrestler." },
      { status: 400 },
    )
  }

  const result = await claimProfile(admin, {
    userId: user.id,
    athleteId,
    relationship: "parent",
    signedName,
    viewerName: accountName || signedName,
    ip: auditIpFrom(request),
    userAgent: request.headers.get("user-agent"),
    reviewNote: typed ? null : "linked from profile setup without a typed signature",
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // A parent link grants sight of the athlete's wallet, so it belongs in the trail.
  await recordAthleteEvent(admin, {
    athleteId,
    userId: user.id,
    changeType: "parent_linked",
    detail: `linked by ${user.id}${user.email ? ` (${user.email})` : ""}`,
    ipAddress: auditIpFrom(request),
  })

  return NextResponse.json({
    success: true,
    athleteId,
    athleteName: result.athleteName,
    message: "Linked. They’ll appear under Your athletes.",
  })
}
