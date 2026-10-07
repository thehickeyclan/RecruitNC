import { after, NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { reportThread } from "@/lib/coach-messages"
import { notifyReport } from "@/lib/coach-messages-notify"

/**
 * Report a conversation or one message in it: { messageId?, reason? }.
 * Staff are texted and must act within 24 hours (App Store guideline 1.2) on /admin/coach-messages.
 */

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { messageId?: unknown; reason?: unknown }

  const admin = createAdminClient()
  const result = await reportThread(admin, threadId, userId, {
    messageId: typeof body.messageId === "string" ? body.messageId : null,
    reason: typeof body.reason === "string" ? body.reason : null,
  })
  if (!result.ok || !result.reportId) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })

  const reportId = result.reportId
  after(() => notifyReport(admin, { reportId, threadId }))
  return NextResponse.json({ ok: true })
}
