import { NextResponse, type NextRequest } from "next/server"

import { familyAthleteIds } from "@/lib/coach-messages"
import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import { isContactKind, listStatusAfter } from "@/lib/college-programs/contacts"
import { isCollegeListStatus } from "@/lib/college-programs/list"
import data from "@/lib/college-programs/programs-2026-27.json"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const SCHOOL_IDS = new Set([...(data.schools as Array<{ id: string }>), ...ANNOUNCED_PROGRAMS].map((s) => s.id))

/**
 * "A college reached out": a family logs a call, text, visit or offer (scripts/add-college-contacts.sql).
 * Free for every family - it is their record and our evidence. For a family with My College List
 * (Blue), the school is added to the list and moved forward to match.
 */
async function familyUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await familyUser()
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const admin = createAdminClient()
  // The "A college reached out" log is part of the Recruiting Command Center (Matt, 21 Oct 2026).
  if (!hasPortalAccess((await resolveRankingViewer({ supabase, admin })).viewer)) {
    return NextResponse.json({ error: "Part of the Recruiting Command Center.", upgrade: "/command-center" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : ""
  const kind = body?.kind
  const happenedOn = typeof body?.happenedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.happenedOn) ? body.happenedOn : new Date().toISOString().slice(0, 10)
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null

  if (!SCHOOL_IDS.has(schoolId)) return NextResponse.json({ error: "Pick a college from the list." }, { status: 400 })
  if (!isContactKind(kind)) return NextResponse.json({ error: "Pick how they reached out." }, { status: 400 })
  if (happenedOn > new Date().toISOString().slice(0, 10)) return NextResponse.json({ error: "That date is in the future." }, { status: 400 })
  // Only the wrestler's own family logs for them.
  if (!(await familyAthleteIds(admin, user.id)).includes(athleteId)) return NextResponse.json({ error: "Not your wrestler." }, { status: 403 })

  const { data: row, error } = await admin
    .from("college_contacts")
    .insert({ user_id: user.id, athlete_id: athleteId, school_id: schoolId, kind, happened_on: happenedOn, note })
    .select("id")
    .single()
  if (error || !row) {
    console.error("[college-contacts] save failed", error?.message)
    return NextResponse.json({ error: error?.code === "42P01" ? "This is being switched on. Try again shortly." : "Could not save. Try again." }, { status: 500 })
  }

  // The college list follows: added if missing, moved forward if behind. Never fails the log.
  try {
    const { viewer } = await resolveRankingViewer({ supabase, admin })
    if (hasPortalAccess(viewer)) {
      const { data: current } = await admin.from("college_list_items").select("status").eq("user_id", user.id).eq("school_id", schoolId).maybeSingle()
      const status = listStatusAfter(current && isCollegeListStatus(current.status) ? current.status : null, kind)
      await admin.from("college_list_items").upsert({ user_id: user.id, school_id: schoolId, status, updated_at: new Date().toISOString() }, { onConflict: "user_id,school_id" })
    }
  } catch (e) {
    console.error("[college-contacts] list update failed", e)
  }
  return NextResponse.json({ ok: true, id: row.id })
}

/** Undo a mistaken entry: the family's own only. */
export async function DELETE(request: NextRequest) {
  const { user } = await familyUser()
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const id = request.nextUrl.searchParams.get("id") ?? ""
  const admin = createAdminClient()
  const { data: row } = await admin.from("college_contacts").select("athlete_id").eq("id", id).maybeSingle()
  if (!row || !(await familyAthleteIds(admin, user.id)).includes(String(row.athlete_id))) return NextResponse.json({ error: "Not found." }, { status: 404 })
  const { error } = await admin.from("college_contacts").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Could not remove. Try again." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
