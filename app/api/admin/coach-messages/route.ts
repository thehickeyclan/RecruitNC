import { NextResponse, type NextRequest } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { displayName } from "@/lib/coach-messages"

/**
 * Staff oversight of coach → prospect messaging.
 *
 * GET   - reports (open first; App Store 1.2 gives 24 hours) and the most recent conversations.
 *         A conversation itself is read through /api/coach-messages/[threadId], which lets admins in.
 * PATCH - { reportId, resolution, stopThread? } closes a report; stopThread also cuts the coach off
 *         from that wrestler. Revoking the coach entirely is done on /admin/users-dashboard.
 */

export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const admin = createAdminClient()

  const [{ data: reports }, { data: threads }] = await Promise.all([
    admin.from("coach_message_reports").select("*").order("created_at", { ascending: false }).limit(200),
    admin
      .from("coach_threads")
      .select("id, coach_user_id, athlete_id, program, created_at, last_message_at, stopped_at")
      .order("last_message_at", { ascending: false })
      .limit(200),
  ])

  const threadRows = threads ?? []
  const reportThreadIds = (reports ?? []).map((r) => r.thread_id as string | null).filter((id): id is string => Boolean(id))
  const missing = reportThreadIds.filter((id) => !threadRows.some((t) => t.id === id))
  if (missing.length) {
    const { data: more } = await admin
      .from("coach_threads")
      .select("id, coach_user_id, athlete_id, program, created_at, last_message_at, stopped_at")
      .in("id", missing)
    threadRows.push(...(more ?? []))
  }

  const userIds = [
    ...new Set([
      ...threadRows.map((t) => t.coach_user_id as string),
      ...(reports ?? []).map((r) => r.reporter_user_id as string | null).filter((id): id is string => Boolean(id)),
    ]),
  ]
  const athleteIds = [...new Set(threadRows.map((t) => t.athlete_id as string))]
  const [{ data: profiles }, { data: athletes }, { data: counts }] = await Promise.all([
    userIds.length
      ? admin.from("user_profiles").select("user_id, full_name, first_name, last_name, email").in("user_id", userIds)
      : Promise.resolve({ data: [] as never[] }),
    athleteIds.length ? admin.from("athletes").select("id, name").in("id", athleteIds) : Promise.resolve({ data: [] as never[] }),
    threadRows.length
      ? admin.from("coach_messages").select("thread_id, sender_role").in("thread_id", threadRows.map((t) => t.id as string))
      : Promise.resolve({ data: [] as never[] }),
  ])
  const people = new Map((profiles ?? []).map((p) => [String(p.user_id), { name: displayName(p), email: (p.email as string | null) ?? null }]))
  const athleteName = new Map((athletes ?? []).map((a) => [String(a.id), String(a.name ?? "")]))
  const tally = new Map<string, { coach: number; family: number }>()
  for (const m of (counts ?? []) as Array<{ thread_id: string; sender_role: string }>) {
    const t = tally.get(m.thread_id) ?? { coach: 0, family: 0 }
    if (m.sender_role === "coach") t.coach++
    else t.family++
    tally.set(m.thread_id, t)
  }

  const shapeThread = (t: (typeof threadRows)[number]) => ({
    id: t.id as string,
    athleteId: t.athlete_id as string,
    athleteName: athleteName.get(String(t.athlete_id)) ?? "",
    coachName: people.get(String(t.coach_user_id))?.name || "Coach",
    coachEmail: people.get(String(t.coach_user_id))?.email ?? null,
    program: (t.program as string | null) ?? null,
    lastMessageAt: t.last_message_at as string,
    stopped: Boolean(t.stopped_at),
    coachMessages: tally.get(String(t.id))?.coach ?? 0,
    familyMessages: tally.get(String(t.id))?.family ?? 0,
  })
  const threadById = new Map(threadRows.map((t) => [String(t.id), shapeThread(t)]))

  return NextResponse.json({
    reports: (reports ?? [])
      .map((r) => ({
        id: r.id as string,
        status: r.status as string,
        reason: (r.reason as string | null) ?? null,
        resolution: (r.resolution as string | null) ?? null,
        createdAt: r.created_at as string,
        resolvedAt: (r.resolved_at as string | null) ?? null,
        messageId: (r.message_id as string | null) ?? null,
        reporter: people.get(String(r.reporter_user_id))?.name || "Unknown",
        thread: r.thread_id ? threadById.get(String(r.thread_id)) ?? null : null,
      }))
      .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "open" ? -1 : 1)),
    threads: threadRows.slice(0, 200).map(shapeThread).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
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
