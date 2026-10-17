import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { loadAthleteTournamentBundle } from "@/lib/athlete-tournament-bundle"
import { nationalEventRows } from "@/lib/athlete-star-rating-load"
import { seniorClassYear } from "@/lib/class-years"
import { getCoachViewsForAthlete } from "@/lib/coach-profile-views"
import { COLLEGE_LIST_STATUSES, isCollegeListStatus } from "@/lib/college-programs/list"
import data from "@/lib/college-programs/programs-2026-27.json"
import { listUpcomingEvents } from "@/lib/college-programs/schedule"
import type { CollegeMapSchool } from "@/lib/college-programs/types"
import { completenessFromRow } from "@/lib/profile-completeness"
import type { Grade } from "@/lib/recruiting/learn/timeline"
import { collegeKey, type RoadmapSignals } from "@/lib/recruiting/roadmap-adapt"

/** Championships whose top eight is All-American; qualifiers and opens are not. */
const NATIONALS = new Set(["NHSCA Nationals", "Super 32", "Fargo"])
const SCHOOL_NAME = new Map((data.schools as CollegeMapSchool[]).map((s) => [s.id, s.name]))

/**
 * What the adaptive roadmap knows about one wrestler: the profile's grades, scores and video, the
 * family's college list, the schedule, the latest season's results and who has viewed him. Each
 * part fails on its own to "nothing known", which only ever leaves the plain roadmap.
 */
export async function loadRoadmapSignals(admin: SupabaseClient, input: { athleteId: string; userId: string; grade: Grade }): Promise<RoadmapSignals> {
  const { data: athlete } = await admin.from("athletes").select("*").eq("id", input.athleteId).maybeSingle()
  const a = (athlete ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Number(v))
  // The latest season: the one under way, or the one just finished before it starts.
  const latest = seniorClassYear() - 1

  const [list, events, views, bundle] = await Promise.all([
    admin.from("college_list_items").select("school_id, status").eq("user_id", input.userId).then((r) => r.data ?? []),
    listUpcomingEvents(admin, input.athleteId).then((r) => r.events.length).catch(() => 0),
    getCoachViewsForAthlete(admin, input.athleteId).catch(() => null),
    loadAthleteTournamentBundle(admin, a).catch(() => null),
  ])

  const stage = (status: unknown) => COLLEGE_LIST_STATUSES.indexOf(isCollegeListStatus(status) ? status : "interested")
  const listed = new Set(list.map((r) => collegeKey(SCHOOL_NAME.get(String(r.school_id)) ?? "")).filter(Boolean))
  const viewedNotListed = (views?.schools ?? []).filter((v) => !listed.has(collegeKey(v.school))).length

  const statePlaces = (bundle?.nchsaa ?? []).filter((r) => r.year >= latest && r.place != null && r.place >= 1).sort((x, y) => Number(x.place) - Number(y.place))
  const nationals = bundle ? nationalEventRows(bundle).filter((r) => NATIONALS.has(r.event) && r.year >= latest && r.placement != null && r.placement <= 8).sort((x, y) => Number(x.placement) - Number(y.placement)) : []

  return {
    firstName: String(a.firstName ?? "").trim() || String(a.name ?? "").trim().split(" ")[0] || "your wrestler",
    grade: input.grade,
    gpa: num(a.academic_gpa),
    sat: num(a.academic_sat),
    act: num(a.academic_act),
    hasVideo: Boolean(String(a.highlight_video_url ?? "").trim()),
    profilePercent: athlete ? completenessFromRow(a).percent : null,
    listCount: list.length,
    questionnaireOrBeyond: list.filter((r) => stage(r.status) >= COLLEGE_LIST_STATUSES.indexOf("questionnaire")).length,
    contactedOrBeyond: list.filter((r) => stage(r.status) >= COLLEGE_LIST_STATUSES.indexOf("contacted")).length,
    upcomingEvents: events,
    viewedNotListed,
    stateFinish: statePlaces[0] ? { year: statePlaces[0].year, place: Number(statePlaces[0].place) } : null,
    nationalFinish: nationals[0] ? { year: nationals[0].year, event: nationals[0].event, place: Number(nationals[0].placement) } : null,
  }
}
