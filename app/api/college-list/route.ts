import { NextResponse, type NextRequest } from "next/server"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { APP_PLANS, APP_STATUSES, PREREADS, admissionsOf, isCollegeListStatus, type CollegeListItem, type CollegeListResponse } from "@/lib/college-programs/list"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"

export const dynamic = "force-dynamic"

const SCHOOL_IDS = new Set([...(data.schools as Array<{ id: string }>), ...ANNOUNCED_PROGRAMS].map((s) => s.id))
/** Postgres "relation does not exist": the SQL in scripts/add-college-list.sql has not been run. */
const TABLE_MISSING = "42P01"

/**
 * My College List is part of the Recruiting Portal: Blue members and admins. College coaches see
 * the full map but have no list - it is the family's side of recruiting.
 */
async function listOwner() {
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  const allowed = Boolean(userId && hasPortalAccess(viewer))
  return { admin, userId: allowed ? userId : null }
}

function toItem(row: Record<string, unknown>): CollegeListItem {
  return {
    schoolId: String(row.school_id),
    status: isCollegeListStatus(row.status) ? row.status : "interested",
    note: row.note == null ? null : String(row.note),
    updatedAt: String(row.updated_at),
    questionnaireDoneAt: row.questionnaire_done_at ? String(row.questionnaire_done_at) : null,
    admissions: admissionsOf(row),
  }
}

/** Postgres "column does not exist": the interest-form column's SQL has not been run yet. */
const COLUMN_MISSING = "42703"
const COLUMNS = "school_id, status, note, updated_at, questionnaire_done_at, app_plan, app_status, app_submitted_on, preread"
const OLD_COLUMNS = "school_id, status, note, updated_at"

export async function GET() {
  const { admin, userId } = await listOwner()
  const empty: CollegeListResponse = { available: false, items: [] }
  if (!userId) return NextResponse.json(empty)

  const read = (cols: string) => admin.from("college_list_items").select(cols).eq("user_id", userId).order("updated_at", { ascending: false })
  let { data: rows, error } = await read(COLUMNS)
  if (error?.code === COLUMN_MISSING) ({ data: rows, error } = await read("school_id, status, note, updated_at, questionnaire_done_at"))
  if (error?.code === COLUMN_MISSING) ({ data: rows, error } = await read(OLD_COLUMNS))
  if (error) {
    // Before the table exists the map simply has no Save button, rather than an error on every load.
    if (error.code !== TABLE_MISSING) console.error("[college-list] read failed", error)
    return NextResponse.json(empty)
  }
  return NextResponse.json({ available: true, items: ((rows ?? []) as unknown as Array<Record<string, unknown>>).map(toItem) } satisfies CollegeListResponse)
}

/** Save a school, or change its status or note. */
export async function PUT(request: NextRequest) {
  const { admin, userId } = await listOwner()
  if (!userId) return NextResponse.json({ error: "My List is part of NC United Blue." }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { schoolId?: unknown; status?: unknown; note?: unknown; questionnaireDone?: unknown; emailed?: unknown; via?: unknown; admissions?: Record<string, unknown> } | null
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : ""
  if (!SCHOOL_IDS.has(schoolId)) return NextResponse.json({ error: "Unknown school." }, { status: 400 })
  if (body?.status !== undefined && !isCollegeListStatus(body.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 })
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) || null : undefined

  const payload = {
        user_id: userId,
        school_id: schoolId,
        ...(body?.status !== undefined ? { status: body.status } : {}),
        ...(note !== undefined ? { note } : {}),
        ...(typeof body?.questionnaireDone === "boolean"
          ? {
              questionnaire_done_at: body.questionnaireDone ? new Date().toISOString() : null,
              // "helper": the autofill helper saw the college's thank-you page; else the family ticked it.
              questionnaire_done_via: body.questionnaireDone ? (body.via === "helper" ? "helper" : "family") : null,
            }
          : {}),
        // The coach email: opened or copied from the composer, or ticked on the reach-out checklist
        // (scripts/add-command-center-visits-reminders.sql). It goes out from the family's own mail app.
        ...(typeof body?.emailed === "boolean" ? { coach_emailed_at: body.emailed ? new Date().toISOString() : null } : {}),
        // Each admissions field the request names; null clears it.
        ...(body?.admissions && typeof body.admissions === "object"
          ? Object.fromEntries(
              (
                [
                  ["plan", "app_plan", APP_PLANS],
                  ["status", "app_status", APP_STATUSES],
                  ["preread", "preread", PREREADS],
                ] as const
              )
                .filter(([k]) => k in body.admissions!)
                .map(([k, col, list]) => [col, (list as readonly string[]).includes(String(body.admissions![k])) ? body.admissions![k] : null])
                .concat("submittedOn" in body.admissions ? [["app_submitted_on", /^\d{4}-\d{2}-\d{2}$/.test(String(body.admissions.submittedOn)) ? body.admissions.submittedOn : null]] : []),
            )
          : {}),
        updated_at: new Date().toISOString(),
      }
  const save = (extra: Record<string, unknown>) =>
    admin
      .from("college_list_items")
      .upsert({ ...payload, ...extra }, { onConflict: "user_id,school_id" })
      .select(typeof body?.questionnaireDone === "boolean" || body?.admissions ? COLUMNS : OLD_COLUMNS)
      .single()
  // A stage move starts the days-in-stage clock (scripts/add-college-list-stage-changed.sql); before
  // that column exists the save goes through without it.
  let { data: row, error } = await save(body?.status !== undefined ? { stage_changed_at: new Date().toISOString() } : {})
  if (error?.code === COLUMN_MISSING && body?.status !== undefined) ({ data: row, error } = await save({}))
  if (error?.code === COLUMN_MISSING && typeof body?.emailed === "boolean") {
    return NextResponse.json({ error: "This is being switched on. Try again shortly." }, { status: 503 })
  }
  if (error || !row) {
    console.error("[college-list] save failed", error)
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 })
  }
  return NextResponse.json({ item: toItem(row as unknown as Record<string, unknown>) })
}

export async function DELETE(request: NextRequest) {
  const { admin, userId } = await listOwner()
  if (!userId) return NextResponse.json({ error: "My List is part of NC United Blue." }, { status: 403 })

  const schoolId = request.nextUrl.searchParams.get("school") ?? ""
  const { error } = await admin.from("college_list_items").delete().eq("user_id", userId).eq("school_id", schoolId)
  if (error) {
    console.error("[college-list] remove failed", error)
    return NextResponse.json({ error: "Could not remove. Try again." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
