import "server-only"

/**
 * Everything the Recruiting Command Center's pages read for one family: the wrestlers still in
 * school, their college list and schedules, Blue access and the family's men's or women's focus.
 * One loader, so the home screen, Plan, Learn and Activity (Matt's design, 14 Oct 2026) can never
 * disagree about who the family is or what they have saved.
 */
import { redirect } from "next/navigation"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { hasPremiumAccess } from "@/lib/ranking-visibility"

import { mostRecentGraduatedClassYear, seniorClassYear } from "@/lib/class-years"
import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { isCollegeListStatus, type CollegeListStatus } from "@/lib/college-programs/list"
import { loadCollegeMap } from "@/lib/college-programs/load"
import { schoolLogoUrl } from "@/lib/college-programs/logo"
import { gradeLabel } from "@/lib/college-programs/outreach-results"
import data from "@/lib/college-programs/programs-2026-27.json"
import { questionnairesForSchool } from "@/lib/college-programs/questionnaires"
import { costShort } from "@/lib/college-programs/tuition"
import { listUpcomingEvents, type UpcomingEvent } from "@/lib/college-programs/schedule"
import { DIVISION_SHORT, primaryDivision, type CollegeMapSchool } from "@/lib/college-programs/types"
import { completenessFromRow } from "@/lib/profile-completeness"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { sendCollegeCoachesToTheirPortal } from "@/lib/recruiting/families-only"
import { resolvePortalViewer } from "@/lib/recruiting/portal-viewer"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { WarRoomSchool, WarRoomWrestler } from "./war-room-plan"
import { hasPortalAccess } from "@/lib/ranking-visibility"


const SCHOOLS = new Map([...(data.schools as CollegeMapSchool[]), ...ANNOUNCED_PROGRAMS].map((s) => [s.id, s]))

export async function loadCommandCenter(returnTo: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/signin?returnTo=${encodeURIComponent(returnTo)}`)

  const admin = createAdminClient()
  await sendCollegeCoachesToTheirPortal(admin, user.id)
  // The signed-in viewer - or, on a developer's machine, the family an admin is previewing.
  const portal = await resolvePortalViewer({ supabase, admin })
  const viewerId = portal.userId ?? user.id
  const viewer = portal.viewer
  const [ids, focus] = await Promise.all([familyAthleteIds(admin, viewerId), familyFocus(admin, viewerId)])
  const blue = hasPortalAccess(viewer)
  /*
   * The Command Center is the subscription: Blue, a Command Center plan, or staff. Everyone else is
   * sent to the plans page from every /my-recruiting page, here in the one loader they all share, so
   * a new page cannot be left open by forgetting its own lock (Matt, 21 Oct 2026: the home, Activity
   * and Learn pages were open to non-subscribers).
   */
  if (!blue) redirect(`/command-center?from=${encodeURIComponent(returnTo)}`)

  const { data: rows } = ids.length
    ? await admin
        .from("athletes")
        .select("id, name, firstName, gender, graduationyear, highschool, photourl, academic_gpa, academic_sat, academic_act, highlight_video_url, phone, contactEmail")
        .in("id", ids)
        .order("graduationyear", { ascending: true })
    : { data: [] }
  // Recruiting ends at graduation. A graduate stays on the account (his profile and results are
  // still his) but has nothing left to plan, so he is not in the Command Center - Liam Hickey, Class of
  // 2026, was the first tab on his father's page in October 2026.
  const graduated = mostRecentGraduatedClassYear()
  const inSchool = (rows ?? []).filter((a) => !a.graduationyear || Number(a.graduationyear) > graduated)
  const graduatesOnly = (rows ?? []).length > 0 && inSchool.length === 0
  const athletes = inSchool.map((a) => ({
    id: String(a.id),
    name: String(a.name ?? "").trim() || "Your wrestler",
    firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "Your wrestler",
    classYear: a.graduationyear ? Number(a.graduationyear) : null,
    gender: a.gender ? String(a.gender) : null,
    highSchool: a.highschool && a.highschool !== "Not specified" ? String(a.highschool) : null,
    photo: a.photourl ? String(a.photourl) : null,
    completeness: completenessFromRow(a as Record<string, unknown>),
  }))

  // The plan is Blue's. Each part fails on its own: a list that will not load must not take the page down.
  let schools: WarRoomSchool[] = []
  const schedules = new Map<string, UpcomingEvent[]>()
  if (blue) {
    const [list, ...events] = await Promise.all([
      admin.from("college_list_items").select("school_id, status, note, updated_at").eq("user_id", viewerId).order("updated_at", { ascending: false }),
      ...athletes.map((a) => listUpcomingEvents(admin, a.id).catch(() => ({ available: false, events: [] as UpcomingEvent[] }))),
    ])
    schools = (list.data ?? []).flatMap((row) => {
      const school = SCHOOLS.get(String(row.school_id))
      if (!school) return []
      const status: CollegeListStatus = isCollegeListStatus(row.status) ? row.status : "interested"
      return [
        {
          id: school.id,
          name: school.name.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
          place: `${school.city}, ${school.state}`,
          level: DIVISION_SHORT[primaryDivision(school)],
          status,
          logo: null as string | null,
          hasQuestionnaire: questionnairesForSchool(school.id).length > 0,
          savedAt: row.updated_at ? String(row.updated_at) : null,
          memo: row.note ? String(row.note) : null,
          onRecruitNC: false,
          tuition: costShort(school.id, school.state),
          noTeam: focus && !school.programs.some((p) => p[focus.gender]) ? `No ${focus.gender === "womens" ? "women's" : "men's"} team` : null,
        },
      ]
    })
    athletes.forEach((a, i) => schedules.set(a.id, events[i]?.events ?? []))
    const logos = await Promise.all(schools.map((s) => schoolLogoUrl({ id: s.id, name: SCHOOLS.get(s.id)?.name ?? s.name })))
    // Colleges whose coaches are on RecruitNC: the thing no recruiting service has (Matt, 15 Oct 2026).
    const onPlatform = await loadCollegeMap(admin, true)
      .then((map) => new Set(map.schools.filter((s) => s.onRecruitNC).map((s) => s.id)))
      .catch(() => new Set<string>())
    schools = schools.map((s, i) => ({ ...s, logo: logos[i], onRecruitNC: onPlatform.has(s.id) }))
  }

  const senior = seniorClassYear()
  const wrestlers: WarRoomWrestler[] = athletes.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    name: a.name,
    grade: gradeLabel(a.classYear, senior),
    profilePercent: a.completeness.percent,
    profileTodo: a.completeness.items.find((item) => !item.done) ?? null,
    events: schedules.get(a.id) ?? [],
  }))


  // College programs that have viewed each wrestler. Names for a subscriber; the count for everyone.
  const premium = blue || hasPremiumAccess(viewer)
  const views = new Map(
    await Promise.all(
      athletes.map(async (a) => {
        const summary = await getCoachViewsForAthlete(admin, a.id).catch(() => null)
        return [a.id, summary ? { programs: summary.schools.length, total: summary.totalViews, schools: premium ? summary.schools : [] } : null] as const
      }),
    ),
  )

  return { viewerId, authUserId: user.id, blue, focus, athletes, wrestlers, schools, graduatesOnly, views, premium }
}

export type CommandCenter = Awaited<ReturnType<typeof loadCommandCenter>>
