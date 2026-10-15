import { NextResponse, type NextRequest } from "next/server"

import { editMessage, unsendMessage } from "@/lib/coach-messages-extras"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Change your own message within 15 minutes: { action: "edit", body } or { action: "unsend" }.
 * The original is kept for NC United staff (lib/coach-messages-extras.ts).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ threadId: string; messageId: string }> }) {
  const { threadId, messageId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; body?: unknown }
  const admin = createAdminClient()
  const result =
    body.action === "unsend"
      ? await unsendMessage(admin, threadId, messageId, userId)
      : body.action === "edit"
        ? await editMessage(admin, threadId, messageId, userId, typeof body.body === "string" ? body.body : "")
        : ({ ok: false, status: 400, error: "Unknown action." } as const)
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status })
}
