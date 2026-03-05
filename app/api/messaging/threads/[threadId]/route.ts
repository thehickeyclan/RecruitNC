import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

/** PATCH: Update thread name and/or visibility. Thread admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "Missing threadId" }, { status: 400 })

  let body: { name?: string; visibility?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const supabase = await createClient()
  const { data: member } = await supabase
    .from("messaging_thread_members")
    .select("role")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .single()
  if (!member || (member as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Only group admins can update the group" }, { status: 403 })
  }

  const updates: { name?: string; visibility?: string } = {}
  const name = typeof body.name === "string" ? body.name.trim() : undefined
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 })
    if (name.length > 200) return NextResponse.json({ error: "Group name must be 200 characters or less" }, { status: 400 })
    updates.name = name
  }
  const visibility = typeof body.visibility === "string" ? body.visibility.trim().toLowerCase() : undefined
  if (visibility !== undefined) {
    if (visibility !== "private" && visibility !== "public") {
      return NextResponse.json({ error: "visibility must be 'private' or 'public'" }, { status: 400 })
    }
    updates.visibility = visibility
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Provide name and/or visibility to update" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: updated, error } = await admin
    .from("messaging_threads")
    .update(updates)
    .eq("id", threadId)
    .select("id, name, visibility")
    .single()

  if (error) {
    if ((error as { code?: string }).code === "42703") {
      return NextResponse.json(
        { error: "visibility column missing. Run: ALTER TABLE messaging_threads ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public'));" },
        { status: 503 }
      )
    }
    console.error("[messaging/threads PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const row = updated as { id: string; name: string; visibility?: string }
  return NextResponse.json({ thread: { id: row.id, name: row.name, visibility: row.visibility ?? "private" } })
}

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

  let thread: { id: string; name: string; type: string; context_type?: string | null; context_id?: string | null; created_at: string; last_message_at: string; visibility?: string | null } | null = null
  let selectError: { code?: string } | null = null
  const { data: threadWithVis, error: errVis } = await supabase
    .from("messaging_threads")
    .select("id, name, type, context_type, context_id, created_at, last_message_at, visibility")
    .eq("id", threadId)
    .single()
  if (errVis && (errVis as { code?: string }).code === "42703") {
    const { data: threadNoVis, error: errNoVis } = await supabase
      .from("messaging_threads")
      .select("id, name, type, context_type, context_id, created_at, last_message_at")
      .eq("id", threadId)
      .single()
    thread = threadNoVis
    selectError = errNoVis
  } else {
    thread = threadWithVis
    selectError = errVis
  }

  if (selectError || !thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 })

  return NextResponse.json({
    thread: {
      id: thread.id,
      name: thread.name,
      type: thread.type,
      context_type: thread.context_type ?? null,
      context_id: thread.context_id ?? null,
      created_at: thread.created_at,
      last_message_at: thread.last_message_at,
      visibility: thread.visibility === "public" ? "public" : "private",
    },
    membership: { role: member.role, notification_level: member.notification_level },
  })
}
