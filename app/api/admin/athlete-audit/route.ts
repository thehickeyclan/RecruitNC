import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

const PAGE_SIZE = 100

/**
 * The athlete change trail, resolved into names.
 *
 * The log has been written for months and read by nothing — the only consumer was a row
 * count. Anyone signed in can edit any athlete, so this is the control, and a control
 * nobody can look at is not one.
 *
 * Athlete and user names are joined here rather than in the browser, because a raw UUID
 * answers none of the questions this page exists for.
 */
export async function GET(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const url = new URL(request.url)
  const changeType = url.searchParams.get("changeType")
  const athleteId = url.searchParams.get("athleteId")
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase()
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1)

  const admin = createAdminClient()

  let query = admin
    .from("athlete_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })

  if (changeType && changeType !== "all") query = query.eq("change_type", changeType)
  if (athleteId) query = query.eq("athlete_id", athleteId)

  const { data: rows, error, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const athleteIds = [...new Set((rows ?? []).map((r) => r.athlete_id).filter(Boolean))]
  const userIds = [...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean))]

  const [{ data: athletes }, { data: profiles }] = await Promise.all([
    athleteIds.length
      ? admin.from("athletes").select("id, name, highschool").in("id", athleteIds)
      : Promise.resolve({ data: [] as any[] }),
    userIds.length
      ? admin.from("user_profiles").select("user_id, full_name, email, profile_type").in("user_id", userIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const athleteById = new Map((athletes ?? []).map((a: any) => [String(a.id), a]))
  const userById = new Map((profiles ?? []).map((p: any) => [String(p.user_id), p]))

  let entries = (rows ?? []).map((row: any) => {
    const athlete = athleteById.get(String(row.athlete_id))
    const editor = userById.get(String(row.user_id))
    return {
      id: String(row.id),
      createdAt: row.created_at as string,
      athleteId: String(row.athlete_id ?? ""),
      athleteName: athlete?.name ?? "(deleted athlete)",
      athleteSchool: athlete?.highschool ?? null,
      // A UUID with no name attached is the reason nobody could use this before.
      editorName: editor?.full_name || editor?.email || (row.user_id ? "Unknown account" : "System"),
      editorEmail: editor?.email ?? null,
      editorType: editor?.profile_type ?? null,
      fieldName: String(row.field_name ?? ""),
      oldValue: row.old_value == null ? "" : String(row.old_value),
      newValue: row.new_value == null ? "" : String(row.new_value),
      changeType: String(row.change_type ?? "athlete_edit"),
      ipAddress: row.ip_address ?? null,
    }
  })

  // Applied after the join so a search can match the athlete or the person who made the
  // change, neither of which is a column on the audit table.
  if (search) {
    entries = entries.filter((e) =>
      [e.athleteName, e.editorName, e.editorEmail, e.fieldName, e.oldValue, e.newValue]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    )
  }

  return NextResponse.json({
    entries,
    page,
    pageSize: PAGE_SIZE,
    total: count ?? entries.length,
    hasMore: (count ?? 0) > page * PAGE_SIZE,
  })
}
