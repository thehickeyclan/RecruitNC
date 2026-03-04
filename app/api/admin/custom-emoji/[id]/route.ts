import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: 401 | 403; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: "Unauthorized" }
  const { data: profile } = await supabase.from("user_profiles").select("is_admin").eq("user_id", user.id).single()
  if (!profile?.is_admin) return { ok: false, status: 403, error: "Admin access required" }
  return { ok: true }
}

/**
 * PATCH: Update display_name, category, or sort_order.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const updates: { display_name?: string; category?: string; sort_order?: number } = {}
  if (typeof body.display_name === "string") updates.display_name = body.display_name.trim() || null
  if (["hs", "college", "club", "ncu", "other"].includes(body.category)) updates.category = body.category
  if (typeof body.sort_order === "number") updates.sort_order = body.sort_order

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("custom_emoji")
    .update(updates)
    .eq("id", id)
    .select("id, slug, image_url, category, display_name, sort_order, created_at")
    .single()

  if (error) {
    console.error("[admin/custom-emoji PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/**
 * DELETE: Remove custom emoji. Blob is left as-is (orphaned); can add cleanup later.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from("custom_emoji").delete().eq("id", id)

  if (error) {
    console.error("[admin/custom-emoji DELETE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
