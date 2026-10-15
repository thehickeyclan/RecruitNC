import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { loadLiveRoster } from "@/lib/coach-roster"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * The wrestlers a coach can start a conversation with: the same list Coach Home searches
 * (lib/coach-roster.ts) - name, school, class and last competed weight, nothing personal.
 * College coaches and admins only; whether a message may actually be sent is still decided per
 * wrestler by canMessage (lib/coach-messages.ts).
 */
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const { data: profile } = await createAdminClient().from("user_profiles").select("role, is_admin, verified_coach").eq("user_id", userId).maybeSingle()
  const who = classifyViewer(profile ?? null)
  if (!who.isCollegeCoach && who.kind !== "admin" && profile?.is_admin !== true) {
    return NextResponse.json({ error: "College coaches only." }, { status: 403 })
  }
  const athletes = await loadLiveRoster()
  return NextResponse.json({ athletes })
}
