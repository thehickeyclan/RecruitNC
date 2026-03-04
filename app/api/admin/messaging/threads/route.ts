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

/** POST: Create a new group thread. Admin only. Creator is always added as the first member (admin); if that fails, the thread is deleted so the group is never left without them. */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: { name?: string; context_type?: string; context_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) return NextResponse.json({ error: "Group name is required" }, { status: 400 })
  if (name.length > 200) return NextResponse.json({ error: "Group name must be 200 characters or less" }, { status: 400 })

  const contextType = typeof body.context_type === "string" ? body.context_type.trim() || null : null
  const contextId = typeof body.context_id === "string" ? body.context_id.trim() || null : null

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: thread, error: threadError } = await admin
    .from("messaging_threads")
    .insert({
      type: "group",
      name,
      context_type: contextType,
      context_id: contextId,
      created_by_user_id: auth.user.id,
      created_at: now,
      last_message_at: now,
    })
    .select("id, name")
    .single()

  if (threadError) {
    console.error("[admin/messaging/threads POST]", threadError)
    return NextResponse.json({ error: threadError.message }, { status: 500 })
  }

  // Creator is always the first member. Use user's session so RLS lets them see the thread (requires messaging_threads_select_creator + messaging_thread_members_insert_self_creator).
  const userClient = await createClient()
  const { error: memberError } = await userClient
    .from("messaging_thread_members")
    .insert({
      thread_id: thread.id,
      user_id: auth.user.id,
      role: "admin",
      notification_level: "all",
      joined_at: now,
    })

  if (memberError) {
    console.error("[admin/messaging/threads POST] member insert", memberError)
    await admin.from("messaging_threads").delete().eq("id", thread.id)
    return NextResponse.json({ error: "Failed to add you to the group. Ensure RLS policy messaging_thread_members_insert_self_creator exists." }, { status: 500 })
  }

  return NextResponse.json({ threadId: thread.id, name: thread.name })
}
