import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

/** POST: Join a group by invite token. Adds current user to the thread and returns threadId. */
export async function POST(request: Request) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { token?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const token = typeof body.token === "string" ? body.token.trim() : ""
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: thread, error: threadErr } = await admin
    .from("messaging_threads")
    .select("id, name")
    .eq("invite_token", token)
    .single()

  if (threadErr || !thread) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 })
  }

  const threadId = (thread as { id: string }).id
  const { data: existing } = await admin
    .from("messaging_thread_members")
    .select("user_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ threadId, name: (thread as { name?: string }).name, already_member: true })
  }

  const now = new Date().toISOString()
  const { error: insertErr } = await admin.from("messaging_thread_members").insert({
    thread_id: threadId,
    user_id: user.id,
    role: "member",
    notification_level: "all",
    joined_at: now,
  })
  if (insertErr) {
    console.error("[messaging/join]", insertErr)
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 })
  }

  return NextResponse.json({ threadId, name: (thread as { name?: string }).name })
}
