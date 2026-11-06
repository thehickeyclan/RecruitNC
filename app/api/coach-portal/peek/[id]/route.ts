import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUserFromRequest } from "@/lib/supabase/auth-from-request"
import { coachInterestScope, withFitSignals } from "@/lib/college-programs/interested-for-coach"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { loadAchievements } from "@/lib/prospect-achievements"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import { programStaffIds, programStages } from "@/lib/recruiting/program-stage"
import { stateName } from "@/lib/athlete-state"

export const dynamic = "force-dynamic"

/**
 * The card a coach sees when he hovers a wrestler on a list (Matt, 6 Nov 2026: the for-coaches
 * card "needs to be in the product"). Everything on it is computed: class, the weight he last
 * competed at, his honors, whether he marked this program, the coach's Perfect Recruit verdict,
 * the room at his weight, and where he sits on the staff's board. Approved coaches and admins.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  const admin = createAdminClient()
  const scope = await coachInterestScope(admin, user.id)
  if (!scope.allowed) return NextResponse.json({ error: "College coaches only" }, { status: 403 })

  const { data: a } = await admin
    .from("athletes")
    .select("id, name, graduationyear, highschool, state, gender, photourl, recruiting_status, college")
    .eq("id", id)
    .maybeSingle()
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const classYear = a.graduationyear ? Number(a.graduationyear) : null
  const staff = await programStaffIds(admin, user.id)
  const [stars, facts, last, interest, fitViewer] = await Promise.all([
    admin.from("college_coach_stars").select("athlete_id, pipeline_stage, updated_at, starred_at").eq("athlete_id", id).in("coach_user_id", staff),
    loadAchievements(admin, [{ id, name: a.name as string }]).then((m) => m.get(id) ?? {}).catch(() => ({})),
    loadLastCompeted(admin, [id], new Map([[id, classYear]])).then((m) => m.get(id) ?? null).catch(() => null),
    scope.schoolId
      ? admin.from("college_interest").select("created_at").eq("school_id", scope.schoolId).eq("athlete_id", id).limit(1).then((r) => r.data?.[0] ?? null, () => null)
      : Promise.resolve(null),
    resolveFitViewer(admin, user.id).catch(() => null),
  ])
  const onBoard = Boolean(stars.data?.length)
  const [signals] = await withFitSignals(admin, [{ id, gender: (a.gender as string | null) ?? null, classYear }], scope.schoolId, scope.gender, new Set(onBoard ? [id] : []), fitViewer)

  // Honors, best first: national podiums, then the state finish.
  const honors: string[] = []
  for (const p of (facts as { nationalPodiums?: string[] }).nationalPodiums ?? []) honors.push(`${p} All-American`)
  const place = Number((facts as { bestStatePlace?: number | null }).bestStatePlace)
  const st = typeof a.state === "string" && a.state ? a.state : null
  if (place === 1) honors.push(`${st ? `${st} ` : ""}state champion`)
  else if (place >= 2 && place <= 6) honors.push(`${st ? `${st} ` : ""}state placer (${ordinal(place)})`)
  else if ((facts as { stateQualifier?: boolean }).stateQualifier) honors.push(`${st ? `${st} ` : ""}state qualifier`)

  const committed = a.recruiting_status === "Committed" && a.college && a.college !== "Not specified" ? String(a.college) : null

  return NextResponse.json(
    {
      id,
      name: a.name,
      photo: (a.photourl as string | null) ?? null,
      classYear,
      school: (a.highschool as string | null) ?? null,
      state: st ? stateName(st) ?? st : null,
      weight: signals?.weight ?? null,
      lastCompeted: last ? { event: last.event, year: last.year } : null,
      honors: honors.slice(0, 4),
      committed,
      interested: Boolean(interest),
      fit: signals?.fit ?? null,
      room: signals?.room ? { weight: signals.room.weight, need: signals.room.need, label: signals.room.label, fall: signals.room.fall } : null,
      onBoard,
      stage: onBoard ? (programStages(stars.data ?? []).get(id) ?? "Prospect") : null,
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  )
}

function ordinal(n: number) {
  return `${n}${n === 2 ? "nd" : n === 3 ? "rd" : "th"}`
}
