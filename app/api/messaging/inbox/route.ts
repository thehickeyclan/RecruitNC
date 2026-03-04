import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

const PREVIEW_LENGTH = 80

export async function GET() {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  // Get my thread IDs from membership first (avoids RLS edge cases and empty .in() below)
  const { data: myMembers, error: membersError } = await supabase
    .from("messaging_thread_members")
    .select("thread_id, last_read_at")
    .eq("user_id", user.id)

  if (membersError) {
    console.error("[messaging/inbox] members", membersError)
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }
  const threadIds = [...new Set((myMembers ?? []).map((m) => m.thread_id))]
  if (threadIds.length === 0) return NextResponse.json({ threads: [] })

  const { data: threads, error: threadsError } = await supabase
    .from("messaging_threads")
    .select("id, name, type, context_type, context_id, last_message_at")
    .in("id", threadIds)
    .order("last_message_at", { ascending: false })

  if (threadsError) {
    console.error("[messaging/inbox] threads", threadsError)
    return NextResponse.json({ error: threadsError.message }, { status: 500 })
  }
  if (!threads?.length) return NextResponse.json({ threads: [] })

  const lastReadByThread = new Map<string, string | null>()
  for (const m of myMembers ?? []) {
    lastReadByThread.set(m.thread_id, (m as { last_read_at?: string | null }).last_read_at ?? null)
  }

  const { data: messages } = await supabase
    .from("messaging_messages")
    .select("id, thread_id, body, created_at, sender_id")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(threadIds.length * 5)

  const lastByThread = new Map<string, { body: string; created_at: string; sender_id: string }>()
  for (const m of messages ?? []) {
    if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, { body: m.body, created_at: m.created_at, sender_id: m.sender_id })
  }

  const { data: allMessages } = await supabase
    .from("messaging_messages")
    .select("thread_id, created_at")
    .in("thread_id", threadIds)
    .neq("sender_id", user.id)

  const unreadByThread = new Map<string, number>()
  for (const tid of threadIds) unreadByThread.set(tid, 0)
  for (const m of allMessages ?? []) {
    const lastRead = lastReadByThread.get(m.thread_id) ?? "1970-01-01T00:00:00Z"
    if (new Date(m.created_at).getTime() > new Date(lastRead).getTime()) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) ?? 0) + 1)
    }
  }

  const list = threads.map((t) => {
    const last = lastByThread.get(t.id)
    const preview = last ? (last.body.slice(0, PREVIEW_LENGTH) + (last.body.length > PREVIEW_LENGTH ? "…" : "")) : null
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      context_type: t.context_type ?? null,
      context_id: t.context_id ?? null,
      last_message_at: t.last_message_at,
      last_message_preview: preview,
      unread_count: unreadByThread.get(t.id) ?? 0,
    }
  })

  return NextResponse.json({ threads: list })
}
