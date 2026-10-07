import { after, NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { coachSend, listThreads } from "@/lib/coach-messages"
import { notifyNewMessage } from "@/lib/coach-messages-notify"

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
  const body = (await request.json().catch(() => ({}))) as { athleteId?: unknown; body?: unknown }
  const athleteId = typeof body.athleteId === "string" ? body.athleteId.trim() : ""
  if (!athleteId) return NextResponse.json({ error: "athleteId is required" }, { status: 400 })

  const admin = createAdminClient()
  const result = await coachSend(admin, userId, athleteId, body.body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  after(() => notifyNewMessage(admin, { threadId: result.threadId, senderUserId: userId, senderRole: result.senderRole }))
  return NextResponse.json({ threadId: result.threadId, messageId: result.messageId, isNewThread: result.isNewThread })
}
