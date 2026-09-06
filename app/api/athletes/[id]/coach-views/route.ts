import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"
import { getCoachViewsForAthlete, teaseCoachViews } from "@/lib/coach-profile-views"
import { isOwnAthlete, hasActiveSubscription } from "@/lib/scouting-report-entitlement-db"

/**
 * Which college programs viewed this wrestler.
 *
 * Named programs are the paid half; the count is free. Only the athlete's own account, a
 * linked parent, a subscriber or an admin sees the names — a stranger gets nothing at all,
 * because who is recruiting a particular minor is not public information.
 *
 * Coaches are never named, only their program. See lib/college-domain-schools.ts.
 */

export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to see this." }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", user.id)
    .maybeSingle()
  const viewer = classifyViewer(profile ?? null)
  const isAdmin = viewer.kind === "admin" || profile?.is_admin === true

  const own = await isOwnAthlete(admin, user.id, id)
  // Only the people this concerns. A rival family does not get to see who is recruiting
  // somebody else's kid, subscription or not.
  if (!own && !isAdmin) {
    return NextResponse.json({ error: "Not available for this profile." }, { status: 403 })
  }

  const summary = await getCoachViewsForAthlete(admin, id)
  const subscribed = isAdmin || (await hasActiveSubscription(admin, user.id))

  if (!subscribed) {
    // Free: the count, never the names. That is the thing worth subscribing for.
    return NextResponse.json({ locked: true, ...teaseCoachViews(summary) })
  }

  return NextResponse.json({ locked: false, ...summary })
}
