import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false as const, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403, error: "Admin required" }
  return { ok: true as const, user }
}

/**
 * GET /api/admin/contacts/messages/[threadId]
 * Fetches all messages within a specific email thread
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { threadId } = await params

  if (!threadId) {
    return NextResponse.json({ error: "threadId is required" }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    // Get all messages in this thread
    const { data: messages, error: messagesErr } = await admin
      .from("admin_email_messages")
      .select("id, thread_id, direction, body_text, created_at, from_email")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(100)

    if (messagesErr) {
      console.error("[admin/contacts/messages/thread] error:", messagesErr.message)
      return NextResponse.json({ error: messagesErr.message }, { status: 500 })
    }

    // Mark thread as read if it has unread inbound messages
    await admin
      .from("admin_email_threads")
      .update({ has_unread_inbound: false })
      .eq("id", threadId)
      .eq("has_unread_inbound", true)

    return NextResponse.json({
      success: true,
      messages: messages || [],
    })
  } catch (e) {
    console.error("[admin/contacts/messages/thread] error:", e)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}
