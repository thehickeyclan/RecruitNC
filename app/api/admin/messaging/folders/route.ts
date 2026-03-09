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

/** GET: List folders for current admin. */
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = (auth as { user: { id: string } }).user.id

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from("messaging_folders")
    .select("id, name, sort_order, created_at")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    if ((error as { code?: string })?.code === "42P01") return NextResponse.json({ folders: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folders: rows ?? [] })
}

/** POST: Create folder. Body: { name: string } */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const userId = (auth as { user: { id: string } }).user.id

  let body: { name?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 })

  const admin = createAdminClient()
  const { data: folder, error } = await admin
    .from("messaging_folders")
    .insert({ user_id: userId, name, sort_order: 0 })
    .select("id, name, sort_order, created_at")
    .single()

  if (error) {
    if ((error as { code?: string })?.code === "42P01") return NextResponse.json({ error: "Folders table not set up. Run scripts/admin-blast-log-and-folders.md" }, { status: 503 })
    if ((error as { code?: string })?.code === "23505") return NextResponse.json({ error: "A folder with this name already exists" }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ folder })
}
