import { NextResponse } from "next/server"
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

/** DELETE: Remove folder (and its thread assignments). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = (auth as { user: { id: string } }).user.id
  const { folderId } = await params
  if (!folderId) return NextResponse.json({ error: "folderId required" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("messaging_folders").delete().eq("id", folderId).eq("user_id", userId)
  if (error) {
    if ((error as { code?: string })?.code === "42P01") return NextResponse.json({ error: "Folders not set up" }, { status: 503 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
