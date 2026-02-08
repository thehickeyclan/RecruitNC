import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { BLUE_IMAGE_KEYS, type BlueImageKey } from "@/lib/blue-content"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { ok: false, status: 401 as const, error: "Unauthorized" }
  }
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single()
  if (!profile?.is_admin) {
    return { ok: false, status: 403 as const, error: "Forbidden" }
  }
  return { ok: true as const }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  let body: { key?: string; value?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const key = body.key as BlueImageKey | undefined
  const value = typeof body.value === "string" ? body.value.trim() : ""
  if (!key || !Object.prototype.hasOwnProperty.call(BLUE_IMAGE_KEYS, key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }
  if (!value || !value.startsWith("http")) {
    return NextResponse.json({ error: "Valid value (URL) required" }, { status: 400 })
  }
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("page_content")
      .upsert({ key, value }, { onConflict: "key" })
    if (error) {
      console.error("[admin/blue/content] upsert error:", error)
      return NextResponse.json(
        { error: "Failed to save. Ensure table page_content exists (key text primary key, value text)." },
        { status: 500 },
      )
    }
    return NextResponse.json({ success: true, key, value })
  } catch (e) {
    console.error("[admin/blue/content]", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
