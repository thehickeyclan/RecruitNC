import { after, NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { getThread, replyInThread } from "@/lib/coach-messages"
import { notifyNewMessage } from "@/lib/coach-messages-notify"

/**
 * One conversation.
 *
 * GET  - every message, marked read for this account. The coach, the wrestler, a linked parent
 *        or an admin (reviewing a report); anyone else gets a 404, not a 403, so a thread id
 *        does not confirm that a conversation exists.
 * POST - write inside it: { body }. This is the only way a family can send anything.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to read this conversation." }, { status: 401 })
  const thread = await getThread(createAdminClient(), threadId, userId)
  if (!thread) return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
  return NextResponse.json({ thread })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { body?: unknown }

  const admin = createAdminClient()
  const result = await replyInThread(admin, threadId, userId, body.body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  after(() => notifyNewMessage(admin, { threadId, senderUserId: userId, senderRole: result.senderRole }))
  return NextResponse.json({ messageId: result.messageId })
}
