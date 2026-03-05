import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required" }
  return { ok: true as const, user }
}

/** PATCH: Archive a thread (admin only). Sets archived_at = now() so it no longer appears in inbox. */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 })

  let body: { archive?: boolean } = {}
  try {
    body = await _request.json()
  } catch {
    body = {}
  }
  if (body.archive !== true) return NextResponse.json({ error: "Body must include { \"archive\": true }" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("messaging_threads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", threadId)

  if (error) {
    console.error("[admin/messaging/threads PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/** DELETE: Permanently delete a thread (admin only). Removes thread and related rows. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: messages } = await admin.from("messaging_messages").select("id").eq("thread_id", threadId)
  for (const m of messages ?? []) {
    await admin.from("messaging_reactions").delete().eq("message_id", m.id)
  }
  await admin.from("messaging_messages").delete().eq("thread_id", threadId)
  await admin.from("messaging_thread_members").delete().eq("thread_id", threadId)
  const { error } = await admin.from("messaging_threads").delete().eq("id", threadId)

  if (error) {
    console.error("[admin/messaging/threads DELETE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
