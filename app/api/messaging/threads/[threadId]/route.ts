import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  const supabase = await createClient()

  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("thread_id, role, notification_level")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: thread, error } = await supabase
    .from("messaging_threads")
    .select("id, name, type, context_type, context_id, created_at, last_message_at")
    .eq("id", threadId)
    .single()

  if (error || !thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

  return NextResponse.json({
    thread: {
      id: thread.id,
      name: thread.name,
      type: thread.type,
      context_type: thread.context_type ?? null,
      context_id: thread.context_id ?? null,
      created_at: thread.created_at,
      last_message_at: thread.last_message_at,
    },
    membership: { role: member.role, notification_level: member.notification_level },
  })
}
