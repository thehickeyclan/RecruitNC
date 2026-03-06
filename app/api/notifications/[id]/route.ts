import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/notifications/[id]
 * Body: { read?: boolean }. Marks the notification as read (read: true) or unread (read: false).
 * Caller must own the notification.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id?.trim()) return NextResponse.json({ error: "id required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { read?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const read = body.read !== false

  const { data: row, error: updateError } = await supabase
    .from("user_notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id.trim())
    .eq("user_id", user.id)
    .select("id, read_at")
    .single()

  if (updateError || !row) {
    if (updateError?.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 })
    console.error("[notifications PATCH]", updateError)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }

  return NextResponse.json({ id: (row as { id: string }).id, read_at: (row as { read_at: string | null }).read_at })
}
