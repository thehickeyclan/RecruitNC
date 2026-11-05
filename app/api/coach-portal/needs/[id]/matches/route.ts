import { NextResponse, type NextRequest } from "next/server"
import { requestedViewAsId } from "@/lib/view-as/subject"
import { viewAsRole } from "@/lib/business/view-as-coach"

import { VIEW_GENDER_COOKIE, viewGenderFor } from "@/lib/recruiting/coach-program"
import { stagedBrandForHost } from "@/lib/recruiting/national-paths"
import { loadNeedMatches, loadProgramNeeds, resolveNeedsCoach } from "@/lib/recruiting/needs-server"
import { loadStarredAthleteIds } from "@/lib/recruiting/starred-ids"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const PRIVATE = { "Cache-Control": "private, no-store" }

/** The wrestlers who fit one of this staff's needs, with who is already on the board. ?as= for admins. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: PRIVATE })
  const admin = createAdminClient()
  const viewing = viewGenderFor(null, request.cookies.get(VIEW_GENDER_COOKIE)?.value)
  let coach = await resolveNeedsCoach(admin, user.id, viewing)
  const as = (await requestedViewAsId(request.nextUrl.searchParams.get("as"))) ?? undefined
  if (as && as !== user.id && (coach?.isAdmin || (!coach && (await viewAsRole(admin, user.id, user.app_metadata)) === "business"))) {
    coach = (await resolveNeedsCoach(admin, as, viewing)) ?? coach
  }
  if (!coach) return NextResponse.json({ error: "For college coaching staff." }, { status: 403, headers: PRIVATE })
  const { needs } = await loadProgramNeeds(admin, { schoolId: coach.schoolId, userId: coach.userId, programName: coach.programName })
  const need = needs.find((n) => n.id === id)
  if (!need) return NextResponse.json({ error: "Not found." }, { status: 404, headers: PRIVATE })
  try {
    const starred = await loadStarredAthleteIds(admin, coach.userId).catch(() => new Set<string>())
    const onRecruitWrestlers = stagedBrandForHost(request.headers.get("host")) === "national"
    const result = await loadNeedMatches(admin, need, { onRecruitWrestlers, starred })
    return NextResponse.json(result, { headers: PRIVATE })
  } catch (error) {
    console.error("[needs] matches", error)
    return NextResponse.json({ error: "Could not load matches." }, { status: 500, headers: PRIVATE })
  }
}
