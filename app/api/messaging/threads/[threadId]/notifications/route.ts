import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMessagingUser } from "@/lib/messaging-auth"

const VALID_LEVELS = ["all", "mentions", "muted"]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  let body: { notification_level?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const level = body.notification_level
  if (!level || !VALID_LEVELS.includes(level)) {
    return NextResponse.json({ error: "notification_level must be one of: all, mentions, muted" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("messaging_thread_members")
    .update({ notification_level: level })
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .select("thread_id, notification_level")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json({ ok: true, notification_level: data.notification_level })
}
