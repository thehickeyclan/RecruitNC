import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/forum/channels/[channelId]/messages/[messageId]
 * Body: { body: string }. Edit message; only author can edit. Updates body and sets edited_at.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  const { channelId, messageId } = await params
  if (!channelId || !messageId) return NextResponse.json({ error: "channelId and messageId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { body?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const text = typeof body.body === "string" ? body.body.trim() : ""
  if (!text) return NextResponse.json({ error: "body is required" }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ error: "body max 2000 characters" }, { status: 400 })

  const admin = createAdminClient()
  const { data: msg, error: fetchErr } = await admin
    .from("forum_messages")
    .select("id, author_id, channel_id")
    .eq("id", messageId)
    .eq("channel_id", channelId)
    .single()

  if (fetchErr || !msg) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  if ((msg as { author_id: string }).author_id !== user.id) return NextResponse.json({ error: "Only the author can edit this message" }, { status: 403 })

  const { data: updated, error: updateErr } = await admin
    .from("forum_messages")
    .update({ body: text, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("id, body, edited_at")
    .single()

  if (updateErr) {
    console.error("[forum/messages PATCH]", updateErr)
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
  }

  return NextResponse.json({
    message: {
      id: (updated as { id: string }).id,
      body: (updated as { body: string }).body,
      edited_at: (updated as { edited_at: string }).edited_at,
    },
  })
}
