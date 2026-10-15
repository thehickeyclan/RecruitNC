import { NextResponse, type NextRequest } from "next/server"

import { addUpcomingEvent, listUpcomingEvents, ownsAthlete, removeUpcomingEvent } from "@/lib/college-programs/schedule"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hasPortalAccess } from "@/lib/ranking-visibility"

export const dynamic = "force-dynamic"

/**
 * A wrestler's upcoming events, kept by the family. Blue members and admins, and only for a
 * wrestler on their own account - this is a minor's whereabouts, so an id from anywhere else is
 * refused rather than read.
 */
async function owner(athleteId: string) {
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !hasPortalAccess(viewer)) return { admin, userId: null, status: 403 as const }
  if (!athleteId || !(await ownsAthlete(admin, userId, athleteId))) return { admin, userId: null, status: 403 as const }
  return { admin, userId, status: 200 as const }
}

const REFUSED = { error: "You can only keep the schedule for your own wrestler." }

export async function GET(request: NextRequest) {
  const athleteId = request.nextUrl.searchParams.get("athlete")?.trim() ?? ""
  const { admin, userId } = await owner(athleteId)
  if (!userId) return NextResponse.json(REFUSED, { status: 403 })
  try {
    return NextResponse.json(await listUpcomingEvents(admin, athleteId))
  } catch (error) {
    console.error("[college-list/schedule]", error)
    return NextResponse.json({ error: "Could not load the schedule." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const athleteId = typeof body.athleteId === "string" ? body.athleteId : ""
  const { admin, userId } = await owner(athleteId)
  if (!userId) return NextResponse.json(REFUSED, { status: 403 })
  const result = await addUpcomingEvent(admin, userId, athleteId, body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ event: result.event })
}

export async function DELETE(request: NextRequest) {
  const athleteId = request.nextUrl.searchParams.get("athlete")?.trim() ?? ""
  const eventId = request.nextUrl.searchParams.get("event")?.trim() ?? ""
  const { admin, userId } = await owner(athleteId)
  if (!userId) return NextResponse.json(REFUSED, { status: 403 })
  if (!(await removeUpcomingEvent(admin, athleteId, eventId))) {
    return NextResponse.json({ error: "Could not remove the event." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
