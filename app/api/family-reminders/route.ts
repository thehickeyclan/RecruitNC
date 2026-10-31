import { NextResponse, type NextRequest } from "next/server"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { isReminderTopic, reminderFromRow } from "@/lib/recruiting/reminders"
import { familyWriter, TABLE_MISSING } from "@/lib/recruiting/visits-server"

export const dynamic = "force-dynamic"

const SCHOOL_IDS = new Set([...(data.schools as Array<{ id: string }>), ...ANNOUNCED_PROGRAMS].map((s) => s.id))
/** A family has no use for hundreds; this stops a runaway loop filling the table. */
const MAX_PENDING = 50

/** Schedule a reminder (scripts/add-command-center-visits-reminders.sql). Sent by /api/cron/family-reminders. */
export async function POST(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : ""
  if (!note) return NextResponse.json({ error: "Add a note: what to remember." }, { status: 400 })
  const at = typeof body?.remindAt === "string" ? new Date(body.remindAt) : null
  if (!at || !Number.isFinite(at.getTime())) return NextResponse.json({ error: "Pick a date and time." }, { status: 400 })
  if (at.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "That time has passed." }, { status: 400 })
  if (at.getTime() > Date.now() + 400 * 864e5) return NextResponse.json({ error: "Pick a time in the next year." }, { status: 400 })
  const athleteId = typeof body?.athleteId === "string" && w.athleteIds.includes(body.athleteId) ? body.athleteId : null
  const schoolId = typeof body?.schoolId === "string" && SCHOOL_IDS.has(body.schoolId) ? body.schoolId : null
  let visitId: string | null = null
  if (typeof body?.visitId === "string" && body.visitId) {
    const { data: v } = await w.admin.from("recruiting_visits").select("athlete_id").eq("id", body.visitId).maybeSingle()
    if (!v || !w.athleteIds.includes(String(v.athlete_id))) return NextResponse.json({ error: "Not your visit." }, { status: 403 })
    visitId = body.visitId
  }
  const topic = isReminderTopic(body?.topic) ? body.topic : visitId ? "visit" : schoolId ? "school" : "note"

  const { count } = await w.admin.from("family_reminders").select("id", { count: "exact", head: true }).eq("user_id", w.userId).is("sent_at", null)
  if ((count ?? 0) >= MAX_PENDING) return NextResponse.json({ error: "That is a lot of reminders. Clear a few first." }, { status: 400 })

  const { data: row, error } = await w.admin
    .from("family_reminders")
    .insert({ user_id: w.userId, athlete_id: athleteId, school_id: schoolId, visit_id: visitId, topic, remind_at: at.toISOString(), note })
    .select("*")
    .single()
  if (error || !row) {
    console.error("[family-reminders] save failed", error?.message)
    return NextResponse.json({ error: error?.code === TABLE_MISSING ? "Reminders are being switched on. Try again shortly." : "Could not save. Try again." }, { status: 500 })
  }
  return NextResponse.json({ reminder: reminderFromRow(row) })
}

export async function DELETE(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const id = request.nextUrl.searchParams.get("id") ?? ""
  const { error } = await w.admin.from("family_reminders").delete().eq("id", id).eq("user_id", w.userId)
  if (error) return NextResponse.json({ error: "Could not remove. Try again." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
