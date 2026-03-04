import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

/** POST: Add a reaction. Body: { emoji: string } (unicode or custom slug). Idempotent. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { threadId, messageId } = await params
  if (!threadId || !messageId) return NextResponse.json({ error: "Missing threadId or messageId" }, { status: 400 })

  let body: { emoji?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : ""
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })
  if (emoji.length > 120) return NextResponse.json({ error: "emoji too long" }, { status: 400 })

  const supabase = await createClient()
  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error } = await supabase.from("messaging_reactions").upsert(
    { message_id: messageId, user_id: user.id, emoji },
    { onConflict: "message_id,user_id,emoji" }
  )
  if (error) {
    console.error("[messaging/reactions POST]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

/** DELETE: Remove a reaction. Body: { emoji: string }. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { threadId, messageId } = await params
  if (!threadId || !messageId) return NextResponse.json({ error: "Missing threadId or messageId" }, { status: 400 })

  let body: { emoji?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const emoji = typeof body.emoji === "string" ? body.emoji.trim() : ""
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  const supabase = await createClient()
  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error } = await supabase
    .from("messaging_reactions")
    .delete()
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
  if (error) {
    console.error("[messaging/reactions DELETE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
