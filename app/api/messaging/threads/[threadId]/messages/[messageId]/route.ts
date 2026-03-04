import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

const MAX_BODY_LENGTH = 2000

/**
 * PATCH: Edit a message. Only the sender can edit; updates body and sets edited_at.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId, messageId } = await params
  if (!threadId || !messageId) {
    return NextResponse.json({ error: "Missing threadId or messageId" }, { status: 400 })
  }

  let body: { body?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const text = typeof body.body === "string" ? body.body.trim() : ""
  if (text.length === 0 || text.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Body must be 1–2000 characters" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: existing } = await supabase
    .from("messaging_messages")
    .select("id, sender_id")
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .single()
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  if (existing.sender_id !== user.id) {
    return NextResponse.json({ error: "Only the sender can edit this message" }, { status: 403 })
  }

  const { data: updated, error } = await supabase
    .from("messaging_messages")
    .update({ body: text, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .select("id, thread_id, sender_id, type, body, created_at, edited_at")
    .single()

  if (error) {
    console.error("[messaging/messages PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

/**
 * DELETE: Delete a message. Only the sender can delete.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string; messageId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId, messageId } = await params
  if (!threadId || !messageId) {
    return NextResponse.json({ error: "Missing threadId or messageId" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: existing } = await supabase
    .from("messaging_messages")
    .select("id, sender_id")
    .eq("id", messageId)
    .eq("thread_id", threadId)
    .single()
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 })
  if (existing.sender_id !== user.id) {
    return NextResponse.json({ error: "Only the sender can delete this message" }, { status: 403 })
  }

  const { error } = await supabase
    .from("messaging_messages")
    .delete()
    .eq("id", messageId)
    .eq("thread_id", threadId)

  if (error) {
    console.error("[messaging/messages DELETE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
