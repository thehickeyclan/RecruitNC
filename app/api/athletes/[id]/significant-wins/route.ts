import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadAthleteSignificantWins } from "@/lib/athlete-significant-wins"
import { resolveRequestUserId } from "@/lib/request-user"
import { maySeeNotableLosses } from "@/lib/viewer-role"

/**
 * The wins on a profile worth a reader's attention, and the notable losses for those recruiting
 * him. The list itself is lib/athlete-significant-wins.ts; this route decides who sees losses.
 */

export const dynamic = "force-dynamic"

/**
 * Notable losses are for the people recruiting a wrestler, and nobody else: verified college
 * coaches and admins (Matt, 14 October 2026: "scouting reports, compare athletes, notable
 * losses.. all coaches only.. not parents or kid"). The wrestler's own family used to be included.
 * Decided here, not on the page: the website hid the row while this endpoint went on handing the
 * list to anyone who asked, and the iPhone app showed it. Cookie or bearer.
 */
async function maySeeLosses(request: NextRequest, admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  const userId = await resolveRequestUserId(request).catch(() => null)
  if (!userId) return false
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  // A college coach has access from sign-up, before review (the same reading as the perfect-recruit flag).
  return maySeeNotableLosses(profile ?? null)
}

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } }

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()
  const lossesVisible = await maySeeLosses(request, admin)
  const { wins, losses } = await loadAthleteSignificantWins(admin, id, { lossesVisible })
  // lossesVisible false means withheld, not "none on file": the row should not be drawn at all.
  return NextResponse.json({ wins, losses, lossesVisible }, PRIVATE)
}
