import { NextResponse, type NextRequest } from "next/server"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { isCollegeListStatus, type CollegeListItem, type CollegeListResponse } from "@/lib/college-programs/list"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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
  const allowed = Boolean(userId && (viewer.isBlueMember || viewer.isAdmin))
  return { admin, userId: allowed ? userId : null }
}

function toItem(row: Record<string, unknown>): CollegeListItem {
  return {
    schoolId: String(row.school_id),
    status: isCollegeListStatus(row.status) ? row.status : "interested",
    note: row.note == null ? null : String(row.note),
    updatedAt: String(row.updated_at),
  }
}

export async function GET() {
  const { admin, userId } = await listOwner()
  const empty: CollegeListResponse = { available: false, items: [] }
  if (!userId) return NextResponse.json(empty)

  const { data: rows, error } = await admin
    .from("college_list_items")
    .select("school_id, status, note, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
  if (error) {
    // Before the table exists the map simply has no Save button, rather than an error on every load.
    if (error.code !== TABLE_MISSING) console.error("[college-list] read failed", error)
    return NextResponse.json(empty)
  }
  return NextResponse.json({ available: true, items: (rows ?? []).map(toItem) } satisfies CollegeListResponse)
}

/** Save a school, or change its status or note. */
export async function PUT(request: NextRequest) {
  const { admin, userId } = await listOwner()
  if (!userId) return NextResponse.json({ error: "My List is part of NC United Blue." }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { schoolId?: unknown; status?: unknown; note?: unknown } | null
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : ""
  if (!SCHOOL_IDS.has(schoolId)) return NextResponse.json({ error: "Unknown school." }, { status: 400 })
  if (body?.status !== undefined && !isCollegeListStatus(body.status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 })
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) || null : undefined

  const { data: row, error } = await admin
    .from("college_list_items")
    .upsert(
      {
        user_id: userId,
        school_id: schoolId,
        ...(body?.status !== undefined ? { status: body.status } : {}),
        ...(note !== undefined ? { note } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,school_id" },
    )
    .select("school_id, status, note, updated_at")
    .single()
  if (error || !row) {
    console.error("[college-list] save failed", error)
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 })
  }
  return NextResponse.json({ item: toItem(row) })
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
