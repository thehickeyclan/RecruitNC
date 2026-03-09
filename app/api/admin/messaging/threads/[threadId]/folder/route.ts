import { NextRequest, NextResponse } from "next/server"
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

/** PUT: Set thread's folder. Body: { folder_id: string | null }. Admin must be member of thread. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = (auth as { user: { id: string } }).user.id
  const { threadId } = await params
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 })

  let body: { folder_id?: string | null } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const folderId = body.folder_id === null || body.folder_id === undefined ? null : (typeof body.folder_id === "string" ? body.folder_id.trim() : null)
  if (folderId === "") return NextResponse.json({ error: "folder_id must be a string or null" }, { status: 400 })

  const admin = createAdminClient()

  const { data: member } = await admin
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "Not a member of this thread" }, { status: 403 })

  try {
    await admin.from("messaging_folder_threads").delete().eq("thread_id", threadId)
    if (!folderId) return NextResponse.json({ ok: true })
    const { data: folder } = await admin.from("messaging_folders").select("id").eq("id", folderId).eq("user_id", userId).maybeSingle()
    if (!folder?.id) return NextResponse.json({ error: "Folder not found or not yours" }, { status: 404 })
    await admin.from("messaging_folder_threads").insert({ folder_id: folderId, thread_id: threadId })
    return NextResponse.json({ ok: true, folder_id: folderId })
  } catch (e) {
    if ((e as { code?: string })?.code === "42P01") return NextResponse.json({ error: "Folders not set up. Run scripts/admin-blast-log-and-folders.md" }, { status: 503 })
    throw e
  }
}
