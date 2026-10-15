import { NextResponse, type NextRequest } from "next/server"

import { ATTACHMENT_BUCKET, attachmentUploadSlot } from "@/lib/coach-messages-extras"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * A signed slot to upload one file into this conversation: { name, type, size }. The browser puts
 * the file straight into the private bucket, then sends the message naming the returned path.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { name?: unknown; type?: unknown; size?: unknown }
  const slot = await attachmentUploadSlot(createAdminClient(), threadId, userId, body)
  return slot.ok ? NextResponse.json({ bucket: ATTACHMENT_BUCKET, path: slot.path, token: slot.token }) : NextResponse.json({ error: slot.error }, { status: slot.status })
}
