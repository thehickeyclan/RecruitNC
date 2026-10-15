import { NextResponse, type NextRequest } from "next/server"

import { toggleReaction } from "@/lib/coach-messages-extras"
import { resolveRequestUserId } from "@/lib/request-user"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Add or take back a reaction: { emoji } from the fixed set. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string; messageId: string }> }) {
  const { threadId, messageId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { emoji?: unknown }
  const result = await toggleReaction(createAdminClient(), threadId, messageId, userId, String(body.emoji ?? ""))
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status })
}
