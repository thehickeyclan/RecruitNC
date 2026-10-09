import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { resolveAthleteOwnership } from "@/lib/mobile/athlete-ownership"
import { isApprovedCoach } from "@/lib/coach-messages"

export const dynamic = "force-dynamic"

/**
 * The athlete's own cell, for the profile's Call / Text button (Matt, 8 October 2026).
 *
 * Never part of the athlete payload, which the edge caches publicly. Answered only for a
 * reviewed college coach - the same test as starting a coach message - for the athlete and
 * their family, and for admins. The athlete's number only: never a parent's.
 *
 * Academics ride along under the same rule (Matt, 8 October 2026: "academic info needs to be
 * local"): GPA, SAT and ACT are private on the website too - self, coaches and admins - so the app
 * shows them in place instead of sending a coach to the browser.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const athleteId = String(id ?? "").trim()
  if (!athleteId) return NextResponse.json({ ok: false, error: "Missing athlete id" }, { status: 400 })

  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ ok: false, error: "Sign in" }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("user_profiles")
    .select("role, verified_coach, verification_status, is_admin")
    .eq("user_id", userId)
    .maybeSingle()
  const allowed =
    profile?.is_admin === true ||
    isApprovedCoach(profile) ||
    (await resolveAthleteOwnership(admin, athleteId, userId)).ok
  if (!allowed) return NextResponse.json({ ok: false, error: "Not available" }, { status: 403 })

  const { data: athlete } = await admin
    .from("athletes")
    .select("cell, cell_number, academic_gpa, academic_sat, academic_act, academic_interest, academic_summary")
    .eq("id", athleteId)
    .maybeSingle()
  const cell = String(athlete?.cell || athlete?.cell_number || "").trim() || null
  const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Number(v))
  const text = (v: unknown) => String(v ?? "").trim() || null
  const academics = {
    gpa: num(athlete?.academic_gpa),
    sat: num(athlete?.academic_sat),
    act: num(athlete?.academic_act),
    interest: text(athlete?.academic_interest),
    summary: text(athlete?.academic_summary),
  }

  return NextResponse.json({ ok: true, cell, academics }, { headers: { "Cache-Control": "private, no-store" } })
}
