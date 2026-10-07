import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { displayName } from "@/lib/coach-messages"

/**
 * Staff oversight of coach → prospect messaging: the numbers, every conversation, every coach,
 * and the report queue.
 *
 * GET   - { stats, threads, coaches, reports }. A conversation's messages are read through
 *         /api/coach-messages/[threadId], which lets admins in without marking it read.
 * PATCH - { reportId, resolution, stopThread? } closes a report; stopThread also cuts the coach off
 *         from that wrestler. Revoking the coach entirely is done on /admin/users-dashboard.
 *
 * Reads everything into memory: volume is coaches × wrestlers they wrote to, hundreds at most for
 * a long while. Paginate when a single load passes a few thousand messages.
 */

export const dynamic = "force-dynamic"

type ThreadRow = {
  id: string
  coach_user_id: string
  athlete_id: string
  program: string | null
  created_at: string
  last_message_at: string
  stopped_at: string | null
}
type MessageRow = { thread_id: string; sender_role: string; sender_user_id: string | null; created_at: string }
type ReportRow = {
  id: string
  thread_id: string | null
  message_id: string | null
  reporter_user_id: string | null
  reason: string | null
  status: string
  resolution: string | null
  created_at: string
  resolved_at: string | null
}

const DAY = 24 * 60 * 60 * 1000

function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Supabase caps a select at 1000 rows; page through so the numbers are whole. */
async function selectAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = createAdminClient()

  let threads: ThreadRow[]
  let messages: MessageRow[]
  let reports: ReportRow[]
  try {
    ;[threads, messages, reports] = await Promise.all([
      selectAll<ThreadRow>((a, b) =>
        admin.from("coach_threads").select("id, coach_user_id, athlete_id, program, created_at, last_message_at, stopped_at").order("last_message_at", { ascending: false }).range(a, b),
      ),
      selectAll<MessageRow>((a, b) =>
        admin.from("coach_messages").select("thread_id, sender_role, sender_user_id, created_at").order("created_at", { ascending: true }).range(a, b),
      ),
      selectAll<ReportRow>((a, b) => admin.from("coach_message_reports").select("*").order("created_at", { ascending: false }).range(a, b)),
    ])
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load messaging data." }, { status: 500 })
  }

  const userIds = [
    ...new Set([...threads.map((t) => t.coach_user_id), ...reports.map((r) => r.reporter_user_id).filter((id): id is string => Boolean(id))]),
  ]
  const athleteIds = [...new Set(threads.map((t) => t.athlete_id))]
  const [{ data: profiles }, { data: athletes }] = await Promise.all([
    userIds.length
      ? admin.from("user_profiles").select("user_id, full_name, first_name, last_name, email, verification_status").in("user_id", userIds)
      : Promise.resolve({ data: [] as never[] }),
    athleteIds.length
      ? admin.from("athletes").select("id, name, graduationyear, claimed_by_user_id").in("id", athleteIds)
      : Promise.resolve({ data: [] as never[] }),
  ])
  const people = new Map(
    (profiles ?? []).map((p) => [String(p.user_id), { name: displayName(p), email: (p.email as string | null) ?? null, status: (p.verification_status as string | null) ?? null }]),
  )
  const athleteById = new Map((athletes ?? []).map((a) => [String(a.id), a]))

  // Per-thread facts from the message log.
  type Facts = { coach: number; athlete: number; parent: number; firstCoachAt: string | null; firstFamilyAt: string | null; lastSenderRole: string | null }
  const facts = new Map<string, Facts>()
  for (const m of messages) {
    const f = facts.get(m.thread_id) ?? { coach: 0, athlete: 0, parent: 0, firstCoachAt: null, firstFamilyAt: null, lastSenderRole: null }
    if (m.sender_role === "coach") {
      f.coach++
      f.firstCoachAt ??= m.created_at
    } else {
      if (m.sender_role === "athlete") f.athlete++
      else f.parent++
      f.firstFamilyAt ??= m.created_at
    }
    f.lastSenderRole = m.sender_role
    facts.set(m.thread_id, f)
  }

  const openReportsByThread = new Map<string, number>()
  for (const r of reports) if (r.status === "open" && r.thread_id) openReportsByThread.set(r.thread_id, (openReportsByThread.get(r.thread_id) ?? 0) + 1)
  const reportedThreads = new Set(reports.map((r) => r.thread_id).filter(Boolean))

  const shapedThreads = threads.map((t) => {
    const f = facts.get(t.id) ?? { coach: 0, athlete: 0, parent: 0, firstCoachAt: null, firstFamilyAt: null, lastSenderRole: null }
    const a = athleteById.get(t.athlete_id)
    const replyHours =
      f.firstCoachAt && f.firstFamilyAt ? (new Date(f.firstFamilyAt).getTime() - new Date(f.firstCoachAt).getTime()) / 3_600_000 : null
    return {
      id: t.id,
      athleteId: t.athlete_id,
      athleteName: String(a?.name ?? ""),
      classYear: a?.graduationyear == null ? null : Number(a.graduationyear),
      claimed: Boolean(a?.claimed_by_user_id),
      coachUserId: t.coach_user_id,
      coachName: people.get(t.coach_user_id)?.name || "Coach",
      coachEmail: people.get(t.coach_user_id)?.email ?? null,
      program: t.program,
      createdAt: t.created_at,
      lastMessageAt: t.last_message_at,
      stopped: Boolean(t.stopped_at),
      coachMessages: f.coach,
      athleteMessages: f.athlete,
      parentMessages: f.parent,
      replied: f.athlete + f.parent > 0,
      replyHours,
      awaiting: f.lastSenderRole === "coach" ? "family" : f.lastSenderRole ? "coach" : null,
      openReports: openReportsByThread.get(t.id) ?? 0,
      everReported: reportedThreads.has(t.id),
    }
  })

  // Per coach.
  const byCoach = new Map<string, typeof shapedThreads>()
  for (const t of shapedThreads) byCoach.set(t.coachUserId, [...(byCoach.get(t.coachUserId) ?? []), t])
  const coaches = [...byCoach.entries()]
    .map(([userId, list]) => {
      const replied = list.filter((t) => t.replied).length
      const since7 = Date.now() - 7 * DAY
      return {
        userId,
        name: people.get(userId)?.name || "Coach",
        email: people.get(userId)?.email ?? null,
        reviewStatus: people.get(userId)?.status ?? null,
        program: list.find((t) => t.program)?.program ?? null,
        conversations: list.length,
        newLast7: list.filter((t) => new Date(t.createdAt).getTime() >= since7).length,
        messagesSent: list.reduce((n, t) => n + t.coachMessages, 0),
        replied,
        replyRate: list.length ? replied / list.length : 0,
        stopped: list.filter((t) => t.stopped).length,
        reported: list.filter((t) => t.everReported).length,
        lastSentAt: list.map((t) => t.lastMessageAt).sort().at(-1) ?? null,
      }
    })
    .sort((a, b) => b.conversations - a.conversations)

  const since7 = Date.now() - 7 * DAY
  const since30 = Date.now() - 30 * DAY
  const replyHours = shapedThreads.map((t) => t.replyHours).filter((h): h is number => h != null)
  const stats = {
    conversations: shapedThreads.length,
    messages: messages.length,
    coachMessages: messages.filter((m) => m.sender_role === "coach").length,
    familyMessages: messages.filter((m) => m.sender_role !== "coach").length,
    replied: shapedThreads.filter((t) => t.replied).length,
    replyRate: shapedThreads.length ? shapedThreads.filter((t) => t.replied).length / shapedThreads.length : 0,
    medianReplyHours: median(replyHours),
    activeCoaches: coaches.length,
    programs: new Set(shapedThreads.map((t) => t.program).filter(Boolean)).size,
    wrestlers: new Set(shapedThreads.map((t) => t.athleteId)).size,
    unclaimedWrestlers: new Set(shapedThreads.filter((t) => !t.claimed).map((t) => t.athleteId)).size,
    stopped: shapedThreads.filter((t) => t.stopped).length,
    openReports: reports.filter((r) => r.status === "open").length,
    newLast7: shapedThreads.filter((t) => new Date(t.createdAt).getTime() >= since7).length,
    newLast30: shapedThreads.filter((t) => new Date(t.createdAt).getTime() >= since30).length,
    messagesLast7: messages.filter((m) => new Date(m.created_at).getTime() >= since7).length,
  }

  // Messages per day for the last 30 days, coach vs family.
  const daily: Array<{ day: string; coach: number; family: number }> = []
  for (let i = 29; i >= 0; i--) daily.push({ day: new Date(Date.now() - i * DAY).toISOString().slice(0, 10), coach: 0, family: 0 })
  const dayIndex = new Map(daily.map((d, i) => [d.day, i]))
  for (const m of messages) {
    const i = dayIndex.get(m.created_at.slice(0, 10))
    if (i == null) continue
    if (m.sender_role === "coach") daily[i].coach++
    else daily[i].family++
  }

  const threadById = new Map(shapedThreads.map((t) => [t.id, t]))
  return NextResponse.json({
    stats,
    daily,
    threads: shapedThreads,
    coaches,
    reports: reports
      .map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        resolution: r.resolution,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
        messageId: r.message_id,
        reporter: people.get(String(r.reporter_user_id))?.name || "Unknown",
        thread: r.thread_id ? threadById.get(r.thread_id) ?? null : null,
      }))
      .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "open" ? -1 : 1)),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const body = (await request.json().catch(() => ({}))) as { reportId?: unknown; resolution?: unknown; stopThread?: unknown }
  const reportId = typeof body.reportId === "string" ? body.reportId : ""
  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 })
  const admin = createAdminClient()

  const { data: report } = await admin.from("coach_message_reports").select("id, thread_id").eq("id", reportId).maybeSingle()
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 })

  const now = new Date().toISOString()
  if (body.stopThread === true && report.thread_id) {
    await admin.from("coach_threads").update({ stopped_at: now }).eq("id", report.thread_id)
  }
  const { error } = await admin
    .from("coach_message_reports")
    .update({
      status: "resolved",
      resolution: String(body.resolution ?? "").trim().slice(0, 1000) || (body.stopThread === true ? "Coach cut off from this wrestler" : "Reviewed"),
      resolved_at: now,
    })
    .eq("id", reportId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
