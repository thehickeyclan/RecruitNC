import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/notifications/read-all
 * Marks all notifications for the current user as read.
 */
export async function PATCH() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("user_notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) {
    console.error("[notifications read-all]", error)
    return NextResponse.json({ error: "Failed to mark all read" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
