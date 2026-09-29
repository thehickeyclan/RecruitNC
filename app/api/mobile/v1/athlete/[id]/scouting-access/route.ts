import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { classifyViewer } from "@/lib/viewer-role"
import { canAccessScoutingReport } from "@/lib/scouting-report-release"
import { scoutingReportAvailable } from "@/lib/scouting-report-access"

export const dynamic = "force-dynamic"

/**
 * Should the app show this viewer a scouting report button on this wrestler?
 *
 * The same two tests the website's button runs — `scouting_report_access` from /api/profile,
 * then `scoutingReportAvailable` on the athlete — decided here rather than in the app, so the
 * allowlist never ships in a bundle and the entry point cannot drift from the endpoint.
 *
 * Cheap on purpose. Asking the report endpoint instead would build a report, write an LLM
 * summary and log an access row on every profile a coach scrolls past.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ available: false })

  const admin = createAdminClient()
  const [{ data: profile }, { data: athlete }] = await Promise.all([
    admin
      .from("user_profiles")
      .select("role, profile_type, verified_coach, is_admin, email")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin.from("athletes").select("gender, graduationyear").eq("id", id).maybeSingle(),
  ])
  if (!athlete) return NextResponse.json({ available: false })

  const viewer = classifyViewer(profile ?? null)
  const canAccess = canAccessScoutingReport({
    email: (profile?.email as string) ?? user.email,
    isCollegeCoach: viewer.isCollegeCoach,
    isAdmin: viewer.kind === "admin" || profile?.is_admin === true,
  })

  return NextResponse.json(
    { available: canAccess && scoutingReportAvailable(athlete) },
    { headers: { "Cache-Control": "no-store" } },
  )
}
