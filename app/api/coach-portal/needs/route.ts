import { NextResponse, type NextRequest } from "next/server"

import { siteFromRequest } from "@/lib/analytics-site"
import { currentClassYears } from "@/lib/class-years"
import { VIEW_GENDER_COOKIE, viewGenderFor } from "@/lib/recruiting/coach-program"
import { cleanNeedInput, needStatus } from "@/lib/recruiting/needs"
import { loadProgramNeeds, resolveNeedsCoach, saveNeeds, updateNeed, type NeedsCoach } from "@/lib/recruiting/needs-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { isDemoNeeds } from "@/lib/recruiting/demo-needs"
import { viewAsRole } from "@/lib/business/view-as-coach"

export const dynamic = "force-dynamic"

const PRIVATE = { "Cache-Control": "private, no-store" }

/**
 * A college staff's recruiting needs (lib/recruiting/needs.ts).
 * GET lists them; POST posts weights for one gender; PATCH { id, action: "confirm" | "clear" }.
 * ?as=<coach user id>: an admin reads that coach's needs (read-only).
 */
async function who(request: NextRequest): Promise<{ admin: ReturnType<typeof createAdminClient>; coach: NeedsCoach } | NextResponse> {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: PRIVATE })
  const admin = createAdminClient()
  const viewing = viewGenderFor(null, request.cookies.get(VIEW_GENDER_COOKIE)?.value)
  let coach = await resolveNeedsCoach(admin, user.id, viewing)
  const as = request.nextUrl.searchParams.get("as")?.trim()
  // Admins, and business accounts (no board of their own), read a named coach's needs.
  if (as && as !== user.id && (coach?.isAdmin || (!coach && (await viewAsRole(admin, user.id, user.app_metadata)) === "business"))) {
    const other = await resolveNeedsCoach(admin, as, viewing)
    if (!other) return NextResponse.json({ error: "Not a coach." }, { status: 404, headers: PRIVATE })
    coach = { ...other, canPost: false }
  }
  if (!coach) return NextResponse.json({ error: "For college coaching staff." }, { status: 403, headers: PRIVATE })
  return { admin, coach }
}

export async function GET(request: NextRequest) {
  const r = await who(request)
  if (r instanceof NextResponse) return r
  const { admin, coach } = r
  const { available, needs } = await loadProgramNeeds(admin, { schoolId: coach.schoolId, userId: coach.userId, programName: coach.programName })
  return NextResponse.json(
    {
      available,
      // Screenshots on a developer's machine show the coach's own controls; nothing saves (demo-needs.ts).
      canPost: coach.canPost || (await isDemoNeeds()),
      program: coach.programName,
      genders: coach.genders,
      classYears: currentClassYears(),
      needs: needs.map((n) => ({ ...n, status: needStatus(n) })),
    },
    { headers: PRIVATE },
  )
}

export async function POST(request: NextRequest) {
  const r = await who(request)
  if (r instanceof NextResponse) return r
  const { admin, coach } = r
  if (!coach.canPost || !coach.programName) return NextResponse.json({ error: "Only a program's own coaches post its needs." }, { status: 403, headers: PRIVATE })
  const cleaned = cleanNeedInput(await request.json().catch(() => null), { genders: coach.genders, classYears: currentClassYears() })
  if (!cleaned.ok) return NextResponse.json({ error: cleaned.error }, { status: 400, headers: PRIVATE })
  try {
    const saved = await saveNeeds(
      admin,
      { userId: coach.userId, schoolId: coach.schoolId, programName: coach.programName, mapSchoolId: coach.mapSchoolId, site: siteFromRequest(request) },
      cleaned.input,
    )
    await admin
      .from("user_analytics")
      .insert({ user_id: coach.userId, event_type: "recruiting_need_posted", event_data: { site: siteFromRequest(request), weights: cleaned.input.weights, gender: cleaned.input.gender } })
      .then(() => null, () => null)
    return NextResponse.json({ needs: saved.map((n) => ({ ...n, status: needStatus(n) })) }, { headers: PRIVATE })
  } catch (error) {
    console.error("[needs] save", error)
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500, headers: PRIVATE })
  }
}

export async function PATCH(request: NextRequest) {
  const r = await who(request)
  if (r instanceof NextResponse) return r
  const { admin, coach } = r
  if (!coach.canPost) return NextResponse.json({ error: "Only a program's own coaches change its needs." }, { status: 403, headers: PRIVATE })
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; action?: unknown }
  const action = body.action === "confirm" || body.action === "clear" ? body.action : null
  if (typeof body.id !== "string" || !action) return NextResponse.json({ error: "Bad request." }, { status: 400, headers: PRIVATE })
  try {
    const need = await updateNeed(admin, { schoolId: coach.schoolId, userId: coach.userId }, body.id, action)
    if (!need) return NextResponse.json({ error: "Not found." }, { status: 404, headers: PRIVATE })
    await admin
      .from("user_analytics")
      .insert({ user_id: coach.userId, event_type: action === "confirm" ? "recruiting_need_confirmed" : "recruiting_need_cleared", event_data: { site: siteFromRequest(request), need_id: need.id } })
      .then(() => null, () => null)
    return NextResponse.json({ need: { ...need, status: needStatus(need) } }, { headers: PRIVATE })
  } catch (error) {
    console.error("[needs] update", error)
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500, headers: PRIVATE })
  }
}
