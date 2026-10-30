import { NextResponse, type NextRequest } from "next/server"

import { ANNOUNCED_PROGRAMS } from "@/lib/college-programs/announced"
import data from "@/lib/college-programs/programs-2026-27.json"
import { cleanOffer, offerFromRow, offerToRow } from "@/lib/recruiting/offers"
import { familyWriter, TABLE_MISSING } from "@/lib/recruiting/visits-server"

export const dynamic = "force-dynamic"

const SCHOOL_IDS = new Set([...(data.schools as Array<{ id: string }>), ...ANNOUNCED_PROGRAMS].map((s) => s.id))
const SWITCHING_ON = "The cost calculator is being switched on. Try again shortly."

/** Save what a college offered one wrestler (scripts/add-college-offers.sql). One offer per wrestler per college. */
export async function PUT(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const athleteId = typeof body?.athleteId === "string" ? body.athleteId : ""
  const schoolId = typeof body?.schoolId === "string" ? body.schoolId : ""
  if (!w.athleteIds.includes(athleteId)) return NextResponse.json({ error: "Not your wrestler." }, { status: 403 })
  if (!SCHOOL_IDS.has(schoolId)) return NextResponse.json({ error: "Pick a college." }, { status: 400 })
  const o = cleanOffer(body)
  if (typeof o === "string") return NextResponse.json({ error: o }, { status: 400 })
  const { data: row, error } = await w.admin
    .from("college_offers")
    .upsert({ user_id: w.userId, athlete_id: athleteId, school_id: schoolId, ...offerToRow(o), updated_at: new Date().toISOString() }, { onConflict: "athlete_id,school_id" })
    .select("*")
    .single()
  if (error || !row) {
    console.error("[college-offers] save failed", error?.message)
    return NextResponse.json({ error: error?.code === TABLE_MISSING ? SWITCHING_ON : "Could not save. Try again." }, { status: 500 })
  }
  return NextResponse.json({ offer: offerFromRow(row) })
}

export async function DELETE(request: NextRequest) {
  const w = await familyWriter()
  if ("error" in w) return NextResponse.json({ error: w.error }, { status: w.status })
  const athleteId = request.nextUrl.searchParams.get("athlete") ?? ""
  const schoolId = request.nextUrl.searchParams.get("school") ?? ""
  if (!w.athleteIds.includes(athleteId)) return NextResponse.json({ error: "Not found." }, { status: 404 })
  const { error } = await w.admin.from("college_offers").delete().eq("athlete_id", athleteId).eq("school_id", schoolId)
  if (error) return NextResponse.json({ error: "Could not remove. Try again." }, { status: 500 })
  return NextResponse.json({ ok: true })
}
