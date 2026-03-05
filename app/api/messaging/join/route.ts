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
    .select("id, name, context_type, context_id")
    .eq("invite_token", token)
    .single()

  if (threadErr || !thread) {
    return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 })
  }

  const threadId = (thread as { id: string }).id
  const contextType = (thread as { context_type?: string | null }).context_type
  const contextId = (thread as { context_id?: string | null }).context_id

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

  // If this is an event-linked thread, add user to event workspace so they see the hub (roster, etc.).
  if (contextType === "event" && contextId) {
    try {
      await admin.from("event_workspace_members").upsert(
        {
          event_slug: contextId,
          user_id: user.id,
          source: "forum_invite",
          created_at: new Date().toISOString(),
        },
        { onConflict: "event_slug,user_id", ignoreDuplicates: true }
      )
    } catch (e) {
      if ((e as { code?: string })?.code !== "42P01") {
        console.warn("[messaging/join] event_workspace_members upsert", (e as Error).message)
      }
    }
  }

  return NextResponse.json({ threadId, name: (thread as { name?: string }).name })
}
