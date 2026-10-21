import { NextResponse, type NextRequest } from "next/server"

import { familyWrestlers, interestSent, setInterest } from "@/lib/college-programs/college-interest"
import data from "@/lib/college-programs/programs-2026-27.json"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const SCHOOL_IDS = new Set((data.schools as Array<{ id: string }>).map((s) => s.id))

/**
 * "Let the coaches know" (Matt, 21 Oct 2026). Any signed-in family, free: GET lists the family's
 * wrestlers and the colleges each has told; PUT { athleteId, schoolId, interested } sets one.
 * Only for a wrestler on the caller's own account.
 */
async function family() {
  const admin = createAdminClient()
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()
  return { admin, userId: user?.id ?? null }
}

export async function GET() {
  const { admin, userId } = await family()
  if (!userId) return NextResponse.json({ available: false, wrestlers: [], sent: [] })
  const wrestlers = await familyWrestlers(admin, userId)
  const { available, sent } = await interestSent(admin, wrestlers.map((w) => w.id))
  return NextResponse.json({ available: available && wrestlers.length > 0, wrestlers, sent }, { headers: { "Cache-Control": "private, no-store" } })
}

export async function PUT(request: NextRequest) {
  const { admin, userId } = await family()
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const athleteId = typeof body.athleteId === "string" ? body.athleteId : ""
  const schoolId = typeof body.schoolId === "string" ? body.schoolId : ""
  if (!SCHOOL_IDS.has(schoolId)) return NextResponse.json({ error: "Unknown college." }, { status: 400 })
  const mine = await familyWrestlers(admin, userId)
  if (!mine.some((w) => w.id === athleteId)) return NextResponse.json({ error: "Only for your own wrestler." }, { status: 403 })
  if (!(await setInterest(admin, userId, athleteId, schoolId, body.interested !== false))) return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
