import { after, NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { coachSend, listThreads } from "@/lib/coach-messages"
import { notifyNewMessage } from "@/lib/coach-messages-notify"
import { noteCoachMessaged } from "@/lib/recruiting/program-stage"
import { moveListsOnCoachMessage } from "@/lib/coach-messages-extras"
import { coachMessagingCompliance } from "@/lib/coach-messages-compliance-server"

/**
 * Coach → prospect messaging. Web (cookies) and the app (bearer token) both call this.
 *
 * GET  - every conversation this account is in, as the coach or as family. `?athleteId=` narrows
 *        to one wrestler (the card on their profile).
 * POST - a coach writes to a wrestler: { athleteId, body }. Opens the conversation the first time.
 *        Families never reach this: they reply inside a thread at /api/coach-messages/[threadId].
 *
 * Rules live in lib/coach-messages.ts.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to see your messages." }, { status: 401 })
  const athleteId = request.nextUrl.searchParams.get("athleteId")?.trim() || undefined
  const threads = await listThreads(createAdminClient(), userId, { athleteId })
  return NextResponse.json({ threads })
}

export async function POST(request: NextRequest) {
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to send a message." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { athleteId?: unknown; body?: unknown; complianceAcknowledged?: unknown }
  const athleteId = typeof body.athleteId === "string" ? body.athleteId.trim() : ""
  if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 })

  const admin = createAdminClient()
  const result = await coachSend(admin, userId, athleteId, body.body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  // A message sent before the coach's level may recruit this wrestler is recorded; nothing is blocked.
  after(async () => {
    const compliance = await coachMessagingCompliance(admin, userId, athleteId).catch(() => null)
    if (!compliance || compliance.status === "open") return
    await admin.from("user_analytics").insert({
      user_id: userId,
      event_type: "coach_compliance_override",
      page_url: "/api/coach-messages",
      event_data: { athlete_id: athleteId, thread_id: result.threadId, status: compliance.status, title: compliance.title, timestamp: new Date().toISOString() },
    })
  })
  after(() => notifyNewMessage(admin, { threadId: result.threadId, senderUserId: userId, senderRole: result.senderRole, isNewThread: result.isNewThread }))
  after(() => noteCoachMessaged(admin, userId, athleteId).catch((e) => console.error("[coach-messages] stage:", e)))
  // The family's list follows the conversation: this college goes on it at "Coach replied".
  after(() => moveListsOnCoachMessage(admin, result.threadId).catch((e) => console.error("[coach-messages] family list:", e)))
  return NextResponse.json({ threadId: result.threadId, messageId: result.messageId, isNewThread: result.isNewThread })
}
