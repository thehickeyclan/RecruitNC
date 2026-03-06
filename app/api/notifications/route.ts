import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const LIMIT = 50

/**
 * GET /api/notifications
 * Returns { notifications: [...], unread_count: number } for the current user.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: rows, error } = await supabase
    .from("user_notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error("[notifications GET]", error)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }

  const notifications = (rows ?? []).map((r) => ({
    id: (r as { id: string }).id,
    type: (r as { type: string }).type,
    title: (r as { title: string }).title,
    body: (r as { body?: string | null })?.body ?? null,
    link: (r as { link?: string | null })?.link ?? null,
    read_at: (r as { read_at?: string | null })?.read_at ?? null,
    created_at: (r as { created_at: string }).created_at,
  }))

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return NextResponse.json({ notifications, unread_count: unreadCount })
}
