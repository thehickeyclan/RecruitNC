import { NextResponse, type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveRequestUserId } from "@/lib/request-user"
import { setStopped } from "@/lib/coach-messages"

/**
 * "Stop messages from this coach" - the family's block (App Store guideline 1.2).
 * { stopped: true } turns the coach off; { stopped: false } lets them write again.
 * The conversation stays readable either way.
 */

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => ({}))) as { stopped?: unknown }
  const result = await setStopped(createAdminClient(), threadId, userId, body.stopped !== false)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 })
  return NextResponse.json({ ok: true })
}
