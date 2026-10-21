import { loadStaffActivity } from "@/lib/recruiting/staff-activity"
import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { classifyViewer } from "@/lib/viewer-role"
import { loadLiveRoster } from "@/lib/coach-roster"
import { loadMyRecruits } from "@/lib/my-recruits"
import { isApprovedCoach, listThreads } from "@/lib/coach-messages"
import { loadFitFlags } from "@/lib/program-fit-bulk"
import { resolveFitViewer } from "@/lib/program-fit-viewer"
import { programLogo as resolveProgramLogo } from "@/lib/coach-program-logo"
import { PUBLIC_TOP_75_COLLEGE_RELEASED, getPublicRankingsMax, releasedClassYears } from "@/lib/public-rankings-cap"
import { coachProgramOf, viewGenderFor } from "@/lib/recruiting/coach-program"
import { currentClassYears } from "@/lib/class-years"
import { groupRecruitsByEvent } from "@/lib/college-programs/competing-next"
import { listUpcomingEventsForAthletes } from "@/lib/college-programs/schedule"
import { loadCompetingAlerts } from "@/lib/college-programs/competing-alerts"
import { interestedInProgram } from "@/lib/college-programs/college-interest"
import { mapSchoolIdFor } from "@/lib/college-programs/load"
import { nearestCollegeWeights } from "@/lib/college-programs/roster-depth"
import { NEED_LABEL, roomByWeight, roomFor, weightsPublished } from "@/lib/college-programs/roster-room"
import { loadLastCompeted } from "@/lib/prospect-last-competed"
import type { CoachHomeData } from "./coach-home-client"
import { inState } from "@/lib/recruiting/states"


/**
 * Everything Coach Home shows one coach, by user id.
 *
 * Apart from the page so the same load can be run for any coach without their session: the local
 * preview (app/dev/coach-preview) renders exactly what a named coach sees, which is how a wrong
 * logo on a head coach's first screen gets caught before he does.
 */
export async function loadCoachHome(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  /** The browser's Men's | Women's switch, when it has been used. The coach's program otherwise. */
  chosenGender?: string | null,
): Promise<{ access: "not-coach"; data: null } | { access: "ok"; data: CoachHomeData }> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, profile_type, verified_coach, verification_status, is_admin, full_name, first_name, school_id")
    .eq("user_id", userId)
    .maybeSingle()
  const classified = classifyViewer(profile ?? null)
  const isAdmin = classified.kind === "admin" || profile?.is_admin === true
  if (!isAdmin && !(classified.isCollegeCoach && classified.verifiedCoach)) {
    return { access: "not-coach", data: null }
  }

  // Men's, women's or both, from sign-up: which board this coach's home is built from.
  const coachProgram = await admin.auth.admin
    .getUserById(userId)
    .then((r) => coachProgramOf(r.data?.user), () => null)
  const viewGender = viewGenderFor(coachProgram, chosenGender)

  // Each part fails on its own: a slow inbox must not take the search and the links down with it.
  const [board, threads, roster, school] = await Promise.all([
    loadMyRecruits(admin, userId).catch(() => null),
    listThreads(admin, userId).catch(() => null),
    loadLiveRoster().catch(() => []),
    profile?.school_id
      ? admin
          .from("schools")
          .select("name, logo_url")
          .eq("id", profile.school_id)
          .maybeSingle()
          .then((r) => ({ name: (r.data?.name as string | null) ?? null, logo: (r.data?.logo_url as string | null) ?? null }), () => null)
      : Promise.resolve(null),
  ])

  /*
   * The program's own logo, then the site's college logo for that name. Only 18 of the 53 schools
   * coaches belong to carry one of their own, and the commitments pages already hold most of the
   * rest. Nothing found means no logo, never a placeholder crest.
   */
  // One function decides this, shared with the staff check at /admin/coach-logos, so that page shows what a coach sees.
  const programLogo = (await resolveProgramLogo({ name: school?.name ?? null, logo_url: school?.logo ?? null })).url

  // The board's five against the program's perfect recruit; an extra, so a failure shows nothing.
  const recruitIds = (board?.recruits ?? []).slice(0, 5).map((r) => r.athleteId)
  const fitViewer = await resolveFitViewer(admin, userId).catch(() => null)
  const fitFlags = fitViewer?.allowed && fitViewer.hasStandard ? await loadFitFlags(admin, recruitIds, fitViewer.saved!.criteria, { personal: fitViewer.personal }).catch(() => null) : null

  const coachThreads = (threads ?? []).filter((t) => t.viewerRole === "coach")
  const recruits = board?.recruits ?? []

  /*
   * Somebody to act on, on the page a coach lands on: the highest-ranked wrestlers in the two
   * oldest published classes who have not committed and are not on this board yet. Nine coaches
   * signed up on 11 October 2026, eight reached this page, and none starred anyone - the first
   * wrestler was four clicks away. Never allowed to fail the page.
   */
  const onBoard = new Set(recruits.map((r) => r.athleteId))
  const lastWeight = new Map((roster as Array<{ id: string; weightclass: string | null }>).map((a) => [a.id, a.weightclass]))
  /*
   * From the coach's own board (Matt, 13 October 2026): a women's coach is suggested ranked women,
   * a men's coach ranked men. The query took no gender at all, so the first ranked girls would
   * have displaced the boys in every men's coach's suggestions.
   */
  const suggestYears = currentClassYears().filter((y) => releasedClassYears(viewGender).includes(y)).slice(0, 2)
  const suggested = suggestYears.length
    ? await inState(admin.from("athletes").select("id, name, graduationyear, highschool, prospect_ranking, college, recruiting_status"))
        .eq("gender", viewGender)
        .in("graduationyear", suggestYears)
        .gte("prospect_ranking", 1)
        .order("prospect_ranking", { ascending: true })
        .limit(120)
        .then(
          (r) => {
            const open = (r.data ?? []).filter((a) => {
              const year = Number(a.graduationyear)
              const college = String(a.college ?? "").trim()
              const status = String(a.recruiting_status ?? "").trim().toLowerCase()
              return (
                Number(a.prospect_ranking) <= getPublicRankingsMax(year, viewGender) &&
                (!college || college === "Not specified") &&
                status !== "committed" &&
                status !== "signed" &&
                !onBoard.has(String(a.id))
              )
            })
            // Ten from each class, seniors first, shown side by side on Coach Home (Matt, 14 October
            // 2026): coaches open profiles from lists they can see, and none was opened from the tab.
            return suggestYears.flatMap((year) =>
              open
                .filter((a) => Number(a.graduationyear) === year)
                .slice(0, 10)
                .map((a) => ({
                  id: String(a.id),
                  name: String(a.name ?? ""),
                  classYear: year,
                  rank: Number(a.prospect_ranking),
                  weight: lastWeight.get(String(a.id)) ?? null,
                  highSchool: (a.highschool as string | null) ?? null,
                })),
            )
          },
          () => [],
        )
    : []
  /*
   * Where the board's wrestlers compete next. Only for a coach staff have approved (and admins):
   * `verified_coach` alone is set at sign-up, before anyone has looked, and this is a minor's
   * schedule. An extra, so a failure shows nothing rather than failing the page.
   */
  const maySeeSchedules = isAdmin || isApprovedCoach(profile ?? null)
  /*
   * Wrestlers whose families told this program they are interested (Matt, 21 Oct 2026), with how
   * each may fit: the coach's own Perfect Recruit standard and the room at his weight in the fall
   * he would arrive. Approved coaches only, like every family-shared detail. An extra: never fails the page.
   */
  const mapSchoolId = school?.name ? mapSchoolIdFor(school.name) : null
  const interested = maySeeSchedules && mapSchoolId ? await loadInterested(admin, mapSchoolId, viewGender, onBoard, fitViewer).catch(() => []) : []
  const recruitMap = new Map(recruits.map((r) => [r.athleteId, { id: r.athleteId, name: r.name, classYear: r.classYear, weight: r.weight, highSchool: r.highSchool }]))
  // Alerts: events just added and this weekend's, for the same approved coaches (Matt, 20 Oct 2026).
  const alerts = maySeeSchedules ? await loadCompetingAlerts(admin, recruitMap).catch(() => ({ added: [], weekend: [] })) : { added: [], weekend: [] }
  const competingNext = maySeeSchedules
    ? await listUpcomingEventsForAthletes(admin, recruits.map((r) => r.athleteId)).then(
        (rows) =>
          groupRecruitsByEvent(
            rows,
            new Map(recruits.map((r) => [r.athleteId, { id: r.athleteId, name: r.name, classYear: r.classYear, weight: r.weight, highSchool: r.highSchool }])),
          ).slice(0, 8),
        () => [],
      )
    : []
  const data: CoachHomeData = {
    // "Coach Hickey", the way a coach is addressed; the full name's last word.
    coachName: String(profile?.full_name ?? "").trim().split(/\s+/).slice(-1)[0] || String(profile?.first_name ?? "").trim() || null,
    isAdmin,
    program: school?.name ?? null,
    programLogo,
    schoolId: (profile?.school_id as string | null) ?? null,
    // The view's gender only: a women's coach searching "Smith" should not get the boys (19 Oct 2026).
    athletes: (roster as Array<{ gender?: string | null }>).filter((a) => sameGender(a.gender, viewGender)) as CoachHomeData["athletes"],
    recruits: {
      loaded: board != null,
      total: recruits.length,
      latest: recruits.slice(0, 5).map((r) => ({
        id: r.athleteId,
        name: r.name,
        classYear: r.classYear,
        weight: r.weight,
        highSchool: r.highSchool,
        lastCompeted: r.activity?.label ?? null,
        fit: fitFlags?.get(r.athleteId) ? { verdict: fitFlags.get(r.athleteId)!.verdict, summary: fitFlags.get(r.athleteId)!.summary } : null,
      })),
      // Who has been on the mat lately: the reason to look at the board again.
      competedRecently: recruits
        .filter((r) => r.activity?.daysAgo != null && r.activity.daysAgo <= 30)
        .sort((a, b) => a.activity!.daysAgo! - b.activity!.daysAgo!)
        .slice(0, 5)
        .map((r) => ({ id: r.athleteId, name: r.name, label: r.activity!.label, event: r.activity!.lastEvent })),
    },
    messages: {
      loaded: threads != null,
      // The reviewed-coach test messaging itself applies; admins read, they do not write.
      canStart: isApprovedCoach(profile ?? null),
      unread: coachThreads.filter((t) => t.unread).length,
      latest: coachThreads.slice(0, 3).map((t) => ({
        id: t.id,
        athleteName: t.athleteName,
        preview: t.lastMessagePreview,
        unread: t.unread,
        yourTurn: t.yourTurn,
      })),
    },
    competingNext,
    alerts,
    interested,
    suggested,
    activity: await loadStaffActivity(admin, userId, 6).catch(() => []),
    rankingYears: [...releasedClassYears(viewGender)],
    viewGender,
    coachProgram,
    top75: PUBLIC_TOP_75_COLLEGE_RELEASED,
  }
  return { access: "ok", data }
}

/** "F", "female" and "Female" are one gender; a row with none is shown on the men's side, as the boards do. */
function sameGender(stored: string | null | undefined, view: string): boolean {
  const isGirl = /^f/i.test(String(stored ?? "").trim())
  return view === "Female" ? isGirl : !isGirl
}

/** The interested wrestlers for one program, each with its two fit signals. */
async function loadInterested(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  gender: "Male" | "Female",
  onBoard: Set<string>,
  fitViewer: Awaited<ReturnType<typeof resolveFitViewer>> | null,
) {
  const rows = (await interestedInProgram(admin, schoolId, gender)).slice(0, 12)
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const [last, flags] = await Promise.all([
    loadLastCompeted(admin, ids, new Map(rows.map((r) => [r.id, r.classYear]))).catch(() => new Map()),
    fitViewer?.allowed && fitViewer.hasStandard ? loadFitFlags(admin, ids, fitViewer.saved!.criteria, { personal: fitViewer.personal }).catch(() => null) : Promise.resolve(null),
  ])
  const team = gender === "Female" ? "womens" : "mens"
  const room = roomFor(schoolId, team)
  return rows.map((r) => {
    const weight = Number(String(last.get(r.id)?.weight ?? "").replace(/[^0-9]/g, "")) || null
    const at = weight && room && weightsPublished(room) && r.classYear ? nearestCollegeWeights(weight, team)[0] : null
    const row = at ? roomByWeight(room!, team, r.classYear!).find((x) => x.weight === at) : null
    const flag = flags?.get(r.id)
    return {
      ...r,
      weight: weight ? String(weight) : null,
      onBoard: onBoard.has(r.id),
      fit: flag ? { verdict: flag.verdict, summary: flag.summary } : null,
      room: row ? { weight: row.weight, need: row.need, label: NEED_LABEL[row.need], staying: row.staying, fall: r.classYear! } : null,
    }
  })
}
