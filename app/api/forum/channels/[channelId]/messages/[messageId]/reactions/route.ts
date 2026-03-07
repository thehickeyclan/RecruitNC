import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/** Ensure user is a member of the group that owns the channel. */
async function ensureChannelMember(channelId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: channel } = await admin
    .from("forum_channels")
    .select("group_id")
    .eq("id", channelId)
    .single()
  if (!channel) return false
  const { data: member } = await admin
    .from("forum_members")
    .select("id")
    .eq("group_id", (channel as { group_id: string }).group_id)
    .eq("user_id", userId)
    .maybeSingle()
  return !!member
}

/** POST: Add a reaction. Body: { emoji: string }. Idempotent. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  const { channelId, messageId } = await params
  if (!channelId || !messageId) return NextResponse.json({ error: "channelId and messageId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { emoji?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : ""
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })
  if (emoji.length > 120) return NextResponse.json({ error: "emoji too long" }, { status: 400 })

  const ok = await ensureChannelMember(channelId, user.id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { data: msg } = await admin
    .from("forum_messages")
    .select("id")
    .eq("id", messageId)
    .eq("channel_id", channelId)
    .single()
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 })

  const { error } = await admin.from("forum_message_reactions").upsert(
    { message_id: messageId, user_id: user.id, emoji },
    { onConflict: "message_id,user_id,emoji" }
  )
  if (error) {
    console.error("[forum/reactions POST]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** DELETE: Remove a reaction. Body: { emoji: string }. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string; messageId: string }> }
) {
  const { channelId, messageId } = await params
  if (!channelId || !messageId) return NextResponse.json({ error: "channelId and messageId required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { emoji?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : ""
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  const ok = await ensureChannelMember(channelId, user.id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("forum_message_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
  if (error) {
    console.error("[forum/reactions DELETE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
