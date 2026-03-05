import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

/** Returns total unread message count across all threads/forums the user belongs to. Used for toolbar badge. */
export async function GET() {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ count: 0 })

  const supabase = await createClient()

  const { data: myMembers, error: membersError } = await supabase
    .from("messaging_thread_members")
    .select("thread_id, last_read_at")
    .eq("user_id", user.id)

  if (membersError) {
    console.error("[messaging/unread-count] members", membersError)
    return NextResponse.json({ count: 0 })
  }
  const threadIds = [...new Set((myMembers ?? []).map((m) => m.thread_id))]
  if (threadIds.length === 0) return NextResponse.json({ count: 0 })

  const lastReadByThread = new Map<string, string | null>()
  for (const m of myMembers ?? []) {
    lastReadByThread.set(m.thread_id, (m as { last_read_at?: string | null }).last_read_at ?? null)
  }

  const { data: allMessages } = await supabase
    .from("messaging_messages")
    .select("thread_id, created_at")
    .in("thread_id", threadIds)
    .neq("sender_id", user.id)

  let total = 0
  for (const m of allMessages ?? []) {
    const lastRead = lastReadByThread.get(m.thread_id) ?? "1970-01-01T00:00:00Z"
    if (new Date(m.created_at).getTime() > new Date(lastRead).getTime()) total += 1
  }

  return NextResponse.json({ count: total })
}
