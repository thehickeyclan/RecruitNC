import { NextResponse, type NextRequest } from "next/server"

import { coachProgramOf, parseCoachProgram } from "@/lib/recruiting/coach-program"
import { setCoachProgram } from "@/lib/recruiting/coach-program-server"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"

export const dynamic = "force-dynamic"

/**
 * A coach's program: men's, women's or both (Matt, 13 October 2026).
 *
 * GET  - the signed-in coach's own, or with ?userId= any coach's, for staff.
 * POST - { program } sets the caller's own; { program, userId } sets somebody else's, staff only.
 *        Staff need that for the coaches who signed up before the question existed.
 *
 * Coaches and staff only: nobody else has a program, and the value steers what a coach is shown.
 */
async function caller(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return null
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  const viewer = classifyViewer(profile ?? null)
  const isAdmin = viewer.kind === "admin" || profile?.is_admin === true
  return { userId, admin, isAdmin, isCoach: viewer.isCollegeCoach }
}

export async function GET(request: NextRequest) {
  const who = await caller(request)
  if (!who) return NextResponse.json({ error: "Sign in." }, { status: 401 })
  const target = new URL(request.url).searchParams.get("userId")
  if (target && target !== who.userId && !who.isAdmin) return NextResponse.json({ error: "Not available." }, { status: 403 })
  const { data } = await who.admin.auth.admin.getUserById(target || who.userId)
  return NextResponse.json({ program: coachProgramOf(data?.user) }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function POST(request: NextRequest) {
  const who = await caller(request)
  if (!who) return NextResponse.json({ error: "Sign in." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { program?: unknown; userId?: unknown } | null
  const program = parseCoachProgram(body?.program)
  if (!program) return NextResponse.json({ error: "Choose men's, women's or both." }, { status: 400 })

  const target = String(body?.userId ?? "").trim() || who.userId
  if (target !== who.userId) {
    if (!who.isAdmin) return NextResponse.json({ error: "Not available." }, { status: 403 })
  } else if (!who.isCoach && !who.isAdmin) {
    return NextResponse.json({ error: "Only college coaches have a program." }, { status: 403 })
  }

  const failed = await setCoachProgram(who.admin, target, program)
  if (failed) {
    console.error("[coach-program]", failed)
    return NextResponse.json({ error: "Could not save that." }, { status: 500 })
  }
  return NextResponse.json({ ok: true, program })
}
