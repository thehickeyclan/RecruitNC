import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { unsentIds } from "@/lib/coach-messages-extras"
import { coachProgramFacts } from "@/lib/coach-messages-compliance-server"
import { listUpcomingEvents } from "@/lib/college-programs/schedule"
import { loadMyRecruits, type MyRecruitRow } from "@/lib/my-recruits"
import { parentContactAccess, parentContactViewer, type ParentContact } from "@/lib/parent-contact"
import { programStages } from "@/lib/recruiting/program-stage"
import { buildTimeline, nextStepFrom, type FileEvent, type TimelineInput } from "@/lib/recruiting/recruit-file-timeline"
import { listNotes, type NoteAuthor, type RecruitNote } from "@/lib/recruiting/recruit-notes"
import { classifyViewer } from "@/lib/viewer-role"

/**
 * One wrestler's recruiting file for one program (app/my-recruits/[athleteId], Matt 2 Nov 2026):
 * where the staff has him, what they wrote, and what has happened between them. Private to the
 * program's staff. The profile is who the wrestler is; this is the program and the wrestler, so
 * nothing here repeats the profile - no results tables, no credential cards.
 */

export type RecruitFile = {
  athleteId: string
  /** The board row (lib/my-recruits.ts): name, photo, class, weight last competed, stage. Null when he is not on the board. */
  row: MyRecruitRow | null
  /** For a wrestler not on the board: enough to name him. */
  basic: { name: string; photoUrl: string | null } | null
  gender: "Male" | "Female" | null
  program: string | null
  /** The date the class's board was published (ranking_editions), for "#4 · Oct 30". */
  rankAsOf: string | null
  nextStep: { date: string; note: string | null; by: string } | null
  notes: RecruitNote[]
  timeline: FileEvent[]
  family: { see: boolean; parent: ParentContact | null; wrestlerCell: string | null; claimed: boolean }
}

export type FileViewer = { userId: string; schoolId: string | null; isAdmin: boolean; isCollegeCoach: boolean }

export async function fileViewer(admin: SupabaseClient, userId: string): Promise<FileViewer> {
  const { data: p } = await admin
    .from("user_profiles")
    .select("school_id, role, is_admin, verified_coach, profile_type")
    .eq("user_id", userId)
    .maybeSingle()
  const v = p ? classifyViewer(p as Parameters<typeof classifyViewer>[0]) : null
  return {
    userId,
    schoolId: (p?.school_id as string | null) ?? null,
    isAdmin: p?.is_admin === true || v?.kind === "admin",
    isCollegeCoach: Boolean(v?.isCollegeCoach),
  }
}

/** Who on the staff is who: "You" for the viewer. */
async function staffNames(admin: SupabaseClient, viewer: FileViewer): Promise<Map<string, string>> {
  const { data } = viewer.schoolId
    ? await admin.from("user_profiles").select("user_id, full_name").eq("school_id", viewer.schoolId)
    : { data: [] as Array<{ user_id: string; full_name: string | null }> }
  const names = new Map((data ?? []).map((s) => [String(s.user_id), String(s.full_name ?? "").trim() || "Staff"]))
  names.set(viewer.userId, "You")
  return names
}

const yearAgo = () => new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10)

/** His dated results from the last 12 months, his own rows and those linked to him (lib/identity). */
async function recentResults(admin: SupabaseClient, athleteId: string): Promise<TimelineInput["results"]> {
  const cols = "id, event_short_name, event_name, event_date, placement, record, weight_class, created_at"
  const since = yearAgo()
  const [{ data: direct }, { data: links }] = await Promise.all([
    admin.from("other_tournament_results").select(cols).eq("athlete_id", athleteId).gte("event_date", since).order("event_date", { ascending: false }).limit(20),
    admin.from("result_athlete_links").select("source_id").eq("source_table", "other_tournament_results").eq("status", "linked").eq("athlete_id", athleteId),
  ])
  const have = new Set((direct ?? []).map((r) => String(r.id)))
  const extraIds = (links ?? []).map((l) => String(l.source_id)).filter((id) => !have.has(id))
  const { data: extra } = extraIds.length
    ? await admin.from("other_tournament_results").select(cols).in("id", extraIds.slice(0, 200)).gte("event_date", since)
    : { data: [] }
  return [...(direct ?? []), ...(extra ?? [])]
    .filter((r) => r.event_date)
    .map((r) => ({
      at: String(r.event_date).slice(0, 10),
      event: String(r.event_short_name || r.event_name || "Tournament").trim(),
      place: r.placement != null ? Number(r.placement) : null,
      record: (r.record as string | null) || null,
      weight: r.weight_class ? String(r.weight_class) : null,
      addedAt: (r.created_at as string | null) ?? null,
    }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12)
}

export async function loadRecruitFile(admin: SupabaseClient, viewer: FileViewer, athleteId: string): Promise<RecruitFile> {
  const me: NoteAuthor = { userId: viewer.userId, schoolId: viewer.schoolId }
  const [board, names, program, { data: athlete }] = await Promise.all([
    loadMyRecruits(admin as never, viewer.userId, { only: athleteId }),
    staffNames(admin, viewer),
    coachProgramFacts(admin, viewer.userId).catch(() => ({ schoolName: null, mapId: null })),
    admin.from("athletes").select("id, name, wrestling_name, photourl, gender, graduationyear, state, claimed_by_user_id").eq("id", athleteId).maybeSingle(),
  ])
  const row = board.recruits[0] ?? null
  const staffIds = [...names.keys()]
  const by = (id: unknown) => names.get(String(id)) ?? "Staff"
  const gender = /^f/i.test(String(athlete?.gender ?? "")) ? "Female" : athlete?.gender ? "Male" : null

  const [notes, views, threads, interest, actions, stars, results, upcoming, contactViewer, parent, edition] = await Promise.all([
    listNotes(admin, me, athleteId).catch(() => [] as RecruitNote[]),
    admin
      .from("user_analytics")
      .select("user_id, created_at")
      .eq("event_type", "profile_view")
      .contains("event_data", { athlete_id: athleteId })
      .in("user_id", staffIds)
      .order("created_at", { ascending: false })
      .limit(300)
      .then((r) => r.data ?? []),
    admin.from("coach_threads").select("id, coach_user_id").eq("athlete_id", athleteId).in("coach_user_id", staffIds).then((r) => r.data ?? []),
    program.mapId
      ? admin.from("college_interest").select("created_at").eq("school_id", program.mapId).eq("athlete_id", athleteId).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
    admin
      .from("recruiting_actions")
      .select("coach_user_id, action_type, action_date, description, follow_up_date")
      .eq("athlete_id", athleteId)
      .in("coach_user_id", staffIds)
      .order("action_date", { ascending: false })
      .limit(100)
      .then((r) => r.data ?? []),
    admin.from("college_coach_stars").select("coach_user_id, starred_at").eq("athlete_id", athleteId).in("coach_user_id", staffIds).then((r) => r.data ?? []),
    recentResults(admin, athleteId).catch(() => []),
    listUpcomingEvents(admin, athleteId).catch(() => ({ available: false, events: [] })),
    parentContactViewer(admin, viewer.userId, athleteId),
    admin.from("athlete_parent_contacts").select("name, email, phone").eq("athlete_id", athleteId).maybeSingle().then((r) => r.data),
    athlete?.graduationyear && gender
      ? admin
          .from("ranking_editions")
          .select("published_at")
          .eq("class_year", Number(athlete.graduationyear))
          .eq("gender", gender)
          .eq("state", row?.state ?? "NC")
          .not("published_at", "is", null)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ])

  const { data: msgs } = threads.length
    ? await admin
        .from("coach_messages")
        .select("id, thread_id, sender_role, body, created_at")
        .in("thread_id", threads.map((t) => t.id))
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] as Array<{ id: string; thread_id: string; sender_role: string; body: string; created_at: string }> }
  const hidden = await unsentIds(admin, (msgs ?? []).map((m) => String(m.id))).catch(() => new Set<string>())
  const coachOf = new Map(threads.map((t) => [String(t.id), String(t.coach_user_id)]))

  const logged: TimelineInput["logged"] = actions.map((a) => ({
    at: String(a.action_date),
    type: String(a.action_type ?? "other"),
    by: by(a.coach_user_id),
    note: (a.description as string | null) ?? null,
    followUp: (a.follow_up_date as string | null) ?? null,
  }))
  const timeline = buildTimeline({
    views: views.map((v) => ({ at: String(v.created_at), by: by(v.user_id) })),
    messages: (msgs ?? [])
      .filter((m) => !hidden.has(String(m.id)))
      .map((m) => ({
        at: String(m.created_at),
        fromCoach: m.sender_role === "coach",
        by: by(coachOf.get(String(m.thread_id))),
        preview: String(m.body ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
        threadId: String(m.thread_id),
      })),
    interest: interest ? { at: String(interest.created_at), program: program.schoolName ?? "your program" } : null,
    logged,
    results,
    upcoming: upcoming.events,
    added: stars.map((s) => ({ at: String(s.starred_at), by: by(s.coach_user_id) })),
  })

  // Verified coaches see the family's contact and never edit it (lib/parent-contact.ts).
  const see = parentContactAccess(contactViewer).see
  return {
    athleteId,
    row,
    basic: athlete ? { name: String(athlete.wrestling_name || athlete.name || "").trim(), photoUrl: (athlete.photourl as string | null) ?? null } : null,
    gender,
    program: program.schoolName,
    rankAsOf: row?.rank != null ? ((edition?.published_at as string | null) ?? null) : null,
    nextStep: nextStepFrom(logged),
    notes,
    timeline,
    family: {
      see,
      parent: see && parent ? { name: parent.name ?? null, email: parent.email ?? null, phone: parent.phone ?? null } : null,
      wrestlerCell: row?.phone ?? null,
      claimed: Boolean(athlete?.claimed_by_user_id),
    },
  }
}

/** The slim bar on the public profile: only whether he is on the board, his stage and how many notes. */
export async function fileSummary(admin: SupabaseClient, viewer: FileViewer, athleteId: string): Promise<{ stage: string; notes: number } | null> {
  const names = await staffNames(admin, viewer)
  const { data: stars } = await admin
    .from("college_coach_stars")
    .select("pipeline_stage, updated_at, starred_at")
    .eq("athlete_id", athleteId)
    .in("coach_user_id", [...names.keys()])
  if (!stars?.length) return null
  const stage = programStages(stars.map((s) => ({ ...s, athlete_id: athleteId })) as Parameters<typeof programStages>[0]).get(athleteId) ?? "Prospect"
  const notes = (await listNotes(admin, { userId: viewer.userId, schoolId: viewer.schoolId }, athleteId).catch(() => [])).length
  return { stage, notes }
}
