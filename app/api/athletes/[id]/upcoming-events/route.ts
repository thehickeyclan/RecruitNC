import { NextResponse, type NextRequest } from "next/server"

import { isApprovedCoach } from "@/lib/coach-messages"
import { listUpcomingEvents, ownsAthlete } from "@/lib/college-programs/schedule"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } }

/**
 * Where a wrestler is competing next, for his profile.
 *
 * A minor's whereabouts, so this is its own private route and never part of the profile payload,
 * which is cached publicly. It answers the wrestler's own family, admins, and college coaches
 * staff have approved (the messaging bar, not merely `verified_coach`, which is set at sign-up
 * before anyone has looked). Everyone else gets `visible: false` and no events - the profile then
 * shows no such section.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hidden = NextResponse.json({ visible: false, events: [] }, PRIVATE)

  const userId = await resolveRequestUserId(request).catch(() => null)
  if (!userId) return hidden

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, verified_coach, verification_status, is_admin")
    .eq("user_id", userId)
    .maybeSingle()

  const family = await ownsAthlete(admin, userId, id).catch(() => false)
  const allowed = family || profile?.is_admin === true || isApprovedCoach(profile ?? null)
  if (!allowed) return hidden

  try {
    const { events } = await listUpcomingEvents(admin, id)
    return NextResponse.json({ visible: true, family, events }, PRIVATE)
  } catch (error) {
    console.error("[upcoming-events]", error)
    return hidden
  }
}
