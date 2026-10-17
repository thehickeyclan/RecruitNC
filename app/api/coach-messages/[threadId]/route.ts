import { after, NextResponse, type NextRequest } from "next/server"
import { coachMessagingCompliance } from "@/lib/coach-messages-compliance-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { getThread, replyInThread } from "@/lib/coach-messages"
import { notifyNewMessage } from "@/lib/coach-messages-notify"
import { noteCoachMessaged } from "@/lib/recruiting/program-stage"
import { cleanAttachment, moveListsOnCoachMessage, saveMessageExtras } from "@/lib/coach-messages-extras"

/**
 * One conversation.
 *
 * GET  - every message, marked read for this account. The coach, the wrestler, a linked parent
 *        or an admin (reviewing a report); anyone else gets a 404, not a 403, so a thread id
 *        does not confirm that a conversation exists.
 * POST - write inside it: { body, replyToId?, attachment? }. This is the only way a family can send
 *        anything. A file alone sends with its name as the words.
 */

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to read this conversation." }, { status: 401 })
  const admin = createAdminClient()
  const thread = await getThread(admin, threadId, userId)
  if (!thread) return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
  // The coach sees whether their level may recruit this wrestler yet; the family never sees it.
  const compliance = thread.viewerRole === "coach" ? await coachMessagingCompliance(admin, userId, thread.athleteId).catch(() => null) : null
  return NextResponse.json({ thread: compliance && compliance.status !== "open" ? { ...thread, compliance } : thread })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to reply." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { body?: unknown; replyToId?: unknown; attachment?: unknown }
  const attachment = cleanAttachment(threadId, body.attachment)
  const words = typeof body.body === "string" && body.body.trim() ? body.body : attachment ? `📎 ${attachment.name}` : body.body

  const admin = createAdminClient()
  const result = await replyInThread(admin, threadId, userId, words)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  await saveMessageExtras(admin, threadId, result.messageId, { replyToId: body.replyToId, attachment })

  after(() => notifyNewMessage(admin, { threadId, senderUserId: userId, senderRole: result.senderRole }))
  // A coach writing again is contact too; a family's reply moves nothing.
  if (result.senderRole === "coach") {
    after(async () => {
      const { data: t } = await admin.from("coach_threads").select("athlete_id").eq("id", threadId).maybeSingle()
      if (t?.athlete_id) await noteCoachMessaged(admin, userId, String(t.athlete_id)).catch((e) => console.error("[coach-messages] stage:", e))
    })
    // The family's list follows the conversation: this college moves to "Coach replied".
    after(() => moveListsOnCoachMessage(admin, threadId).catch((e) => console.error("[coach-messages] family list:", e)))
  }
  return NextResponse.json({ messageId: result.messageId })
}
