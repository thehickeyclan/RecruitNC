import { NextRequest, NextResponse } from "next/server"

import { recordAthleteChanges } from "@/lib/athlete-audit"
import { cleanGpa, cleanScore, type TestKind } from "@/lib/recruiting/academic-checkin"
import { respondentFor } from "@/lib/recruiting/priorities/store"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * The Command Center academic check-in (lib/recruiting/academic-checkin.ts). The wrestler's own
 * login or a linked parent only (respondentFor): never a coach, a preview or a business account.
 *
 * Actions:
 *   gpa         { gpa }                      sets athletes.academic_gpa (the trigger dates it)
 *   gpa_same    {}                           "Still 3.50": confirms it without a change
 *   test_score  { test, score }              sets academic_sat or academic_act
 *   test_status { status, test?, date? }     not_yet | planned (with test and date) | not_taking
 *   test_later  {}                           "Not back yet": asks for the score in two weeks
 */
const TABLE_MISSING = new Set(["42P01", "PGRST205"])
const isTest = (v: unknown): v is TestKind => v === "sat" || v === "act"

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  const action = String(body?.action ?? "")
  if (!athleteId) return NextResponse.json({ error: "athleteId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) return NextResponse.json({ error: "Sign in" }, { status: 401 })
  const admin = createAdminClient()
  if (!(await respondentFor(admin, userId, athleteId).catch(() => null))) return NextResponse.json({ error: "Not your wrestler" }, { status: 403 })

  const now = new Date().toISOString()
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null

  const setAthlete = async (field: "academic_gpa" | "academic_sat" | "academic_act", value: number) => {
    const { data: before } = await admin.from("athletes").select(field).eq("id", athleteId).maybeSingle()
    const { error } = await admin.from("athletes").update({ [field]: value, updated_at: now }).eq("id", athleteId)
    if (error) throw error
    await recordAthleteChanges(admin, [
      { athleteId, userId, fieldName: field, oldValue: (before as Record<string, unknown> | null)?.[field] ?? "", newValue: value, changeType: "athlete_edit", ipAddress: ip },
    ])
  }
  const checkin = async (row: Record<string, unknown>) => {
    const { error } = await admin.from("academic_checkins").upsert({ athlete_id: athleteId, ...row, updated_by: userId, updated_at: now }, { onConflict: "athlete_id" })
    if (error) throw error
  }

  try {
    if (action === "gpa") {
      const gpa = cleanGpa(body?.gpa)
      if (gpa == null) return NextResponse.json({ error: "Enter a GPA between 0 and 5, like 3.45" }, { status: 400 })
      await setAthlete("academic_gpa", gpa)
      // A new GPA is its own confirmation; the trigger dates it. The check-in row is optional here.
      await checkin({ gpa_confirmed_at: now }).catch(() => null)
    } else if (action === "gpa_same") {
      await checkin({ gpa_confirmed_at: now })
    } else if (action === "test_score") {
      const test = body?.test
      if (!isTest(test)) return NextResponse.json({ error: "SAT or ACT" }, { status: 400 })
      const score = cleanScore(test, body?.score)
      if (score == null) return NextResponse.json({ error: test === "sat" ? "SAT scores run 400 to 1600" : "ACT scores run 1 to 36" }, { status: 400 })
      await setAthlete(test === "sat" ? "academic_sat" : "academic_act", score)
    } else if (action === "test_status") {
      const status = body?.status
      if (status === "not_yet" || status === "not_taking") {
        await checkin({ test_status: status, test_kind: null, test_date: null, test_answered_at: now })
      } else if (status === "planned") {
        const test = body?.test
        const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null
        if (!isTest(test) || !date) return NextResponse.json({ error: "Pick the test and its date" }, { status: 400 })
        await checkin({ test_status: "planned", test_kind: test, test_date: date, test_answered_at: now })
      } else return NextResponse.json({ error: "Unknown answer" }, { status: 400 })
    } else if (action === "test_later") {
      await checkin({ test_answered_at: now })
    } else return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    if (TABLE_MISSING.has(String((e as { code?: string })?.code))) return NextResponse.json({ error: "Not switched on yet" }, { status: 503 })
    console.error("[academics]", e)
    return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
