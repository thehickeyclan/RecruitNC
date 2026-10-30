import { NextResponse, type NextRequest } from "next/server"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { listStatusAfter } from "@/lib/college-programs/contacts"
import { isCollegeListStatus } from "@/lib/college-programs/list"
import data from "@/lib/college-programs/programs-2026-27.json"
import { cleanVisit, isVisitOutcome, visitFromRow, VISIT_KIND_LABEL } from "@/lib/recruiting/visits"
import { familyWriter, TABLE_MISSING } from "@/lib/recruiting/visits-server"

export const dynamic = "force-dynamic"

const SCHOOL_IDS = new Set([...(data.schools as Array<{ id: string }>), ...ANNOUNCED_PROGRAMS].map((s) => s.id))
const SWITCHING_ON = "Visits are being switched on. Try again shortly."

/** Plan a visit (scripts/add-command-center-visits-reminders.sql). */
export async function POST(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : ""
  if (!w.athleteIds.includes(athleteId)) return NextResponse.json({ error: "Not your wrestler." }, { status: 403 })
  if (!SCHOOL_IDS.has(schoolId)) return NextResponse.json({ error: "Pick a college." }, { status: 400 })
  const v = cleanVisit(body)
  if (typeof v === "string") return NextResponse.json({ error: v }, { status: 400 })
  const { data: row, error } = await w.admin
    .from("recruiting_visits")
    .insert({ user_id: w.userId, athlete_id: athleteId, school_id: schoolId, kind: v.kind, starts_on: v.startsOn, ends_on: v.endsOn, who: v.who, notes: v.notes })
    .select("*")
    .single()
  if (error || !row) {
    console.error("[recruiting-visits] save failed", error?.message)
    return NextResponse.json({ error: error?.code === TABLE_MISSING ? SWITCHING_ON : "Could not save. Try again." }, { status: 500 })
  }
  return NextResponse.json({ visit: visitFromRow(row) })
}

/**
 * Edit a visit, or answer "did it happen?". "happened" logs a visit contact (college_contacts) and
 * moves the school forward on My College List, the same as "A college reached out".
 */
export async function PATCH(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const id = typeof body?.id === "string" ? body.id : ""
  const { data: current } = await w.admin.from("recruiting_visits").select("*").eq("id", id).maybeSingle()
  if (!current || !w.athleteIds.includes(String(current.athlete_id))) return NextResponse.json({ error: "Not found." }, { status: 404 })

  if (body?.outcome !== undefined) {
    if (!isVisitOutcome(body.outcome)) return NextResponse.json({ error: "Unknown answer." }, { status: 400 })
    const visit = visitFromRow(current)
    let contactId: string | null = current.contact_id ? String(current.contact_id) : null
    if (body.outcome === "happened" && !contactId) {
      const happenedOn = visit.endsOn ?? visit.startsOn
      const { data: contact, error } = await w.admin
        .from("college_contacts")
        .insert({ user_id: w.userId, athlete_id: visit.athleteId, school_id: visit.schoolId, kind: "visit", happened_on: happenedOn, note: VISIT_KIND_LABEL[visit.kind] })
        .select("id")
        .single()
      if (error) console.error("[recruiting-visits] contact failed", error.message)
      contactId = contact ? String(contact.id) : null
      try {
        const { data: item } = await w.admin.from("college_list_items").select("status").eq("user_id", w.userId).eq("school_id", visit.schoolId).maybeSingle()
        const before = item && isCollegeListStatus(item.status) ? item.status : null
        const status = listStatusAfter(before, "visit")
        if (status !== before) {
          await w.admin
            .from("college_list_items")
            .upsert({ user_id: w.userId, school_id: visit.schoolId, status, updated_at: new Date().toISOString(), stage_changed_at: new Date().toISOString() }, { onConflict: "user_id,school_id" })
        }
      } catch (e) {
        console.error("[recruiting-visits] list update failed", e)
      }
    }
    // Taking back "it happened" removes the visit it logged.
    if (body.outcome !== "happened" && contactId) {
      await w.admin.from("college_contacts").delete().eq("id", contactId)
      contactId = null
    }
    const { data: row, error } = await w.admin.from("recruiting_visits").update({ outcome: body.outcome, contact_id: contactId, updated_at: new Date().toISOString() }).eq("id", id).select("*").single()
    if (error || !row) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 })
    return NextResponse.json({ visit: visitFromRow(row) })
  }

  const v = cleanVisit(body)
  if (typeof v === "string") return NextResponse.json({ error: v }, { status: 400 })
  const { data: row, error } = await w.admin
    .from("recruiting_visits")
    .update({ kind: v.kind, starts_on: v.startsOn, ends_on: v.endsOn, who: v.who, notes: v.notes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single()
  if (error || !row) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 })
  return NextResponse.json({ visit: visitFromRow(row) })
}

export async function DELETE(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const id = request.nextUrl.searchParams.get("id") ?? ""
  const { data: current } = await w.admin.from("recruiting_visits").select("athlete_id, contact_id").eq("id", id).maybeSingle()
  if (!current || !w.athleteIds.includes(String(current.athlete_id))) return NextResponse.json({ error: "Not found." }, { status: 404 })
  const { error } = await w.admin.from("recruiting_visits").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Could not remove. Try again." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
