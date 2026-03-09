import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false as const, status: 401 as const, error: "Unauthorized", user: null }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false as const, status: 403 as const, error: "Admin required", user: null }
  return { ok: true as const, user }
}

/** GET: List threads the admin is in, with folder_id for each (for organizing). */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = (auth as { user: { id: string } }).user.id

  const admin = createAdminClient()

  const { data: members, error: memErr } = await admin
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("user_id", userId)
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 })
  const threadIds = [...new Set((members ?? []).map((m) => (m as { thread_id: string }).thread_id))]
  if (threadIds.length === 0) return NextResponse.json({ threads: [] })

  const { data: threadRows, error: threadErr } = await admin
    .from("messaging_threads")
    .select("id, name, type, context_type, context_id, last_message_at")
    .in("id", threadIds)
    .order("last_message_at", { ascending: false })
  if (threadErr) return NextResponse.json({ error: threadErr.message }, { status: 500 })

  const folderByThread = new Map<string, string>()
  try {
    const { data: ft } = await admin
      .from("messaging_folder_threads")
      .select("folder_id, thread_id")
      .in("thread_id", threadIds)
    const folderIds = [...new Set((ft ?? []).map((r) => (r as { folder_id: string }).folder_id))]
    const { data: folders } = await admin.from("messaging_folders").select("id, user_id").in("id", folderIds).eq("user_id", userId)
    const allowedFolderIds = new Set((folders ?? []).map((f) => (f as { id: string }).id))
    for (const r of ft ?? []) {
      const row = r as { folder_id: string; thread_id: string }
      if (allowedFolderIds.has(row.folder_id)) folderByThread.set(row.thread_id, row.folder_id)
    }
  } catch {
    // tables may not exist
  }

  const threads = (threadRows ?? []).map((t) => {
    const row = t as { id: string; name: string; type: string; context_type: string | null; context_id: string | null; last_message_at: string }
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      context_type: row.context_type,
      context_id: row.context_id,
      last_message_at: row.last_message_at,
      folder_id: folderByThread.get(row.id) ?? null,
    }
  })

  return NextResponse.json({ threads })
}
