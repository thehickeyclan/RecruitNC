import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export type ForYouResponse = {
  newAnnouncements: number
  eventsThisWeek: number
  unreadChatCount: number
}

/**
 * GET /api/communities/for-you
 * Returns a short digest for the current user: new announcements, events this week, unread chat count.
 * Used for "For you" strip at top of Community sidebar and future push copy.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user?.id) {
    return NextResponse.json({
      newAnnouncements: 0,
      eventsThisWeek: 0,
      unreadChatCount: 0,
    })
  }

  const admin = createAdminClient()
  const now = new Date()

  let newAnnouncements = 0
  let unreadChatCount = 0

  // Threads user is in
  const { data: members } = await admin
    .from("messaging_thread_members")
    .select("thread_id, last_read_at")
    .eq("user_id", user.id)
  const threadIds = (members ?? []).map((m) => (m as { thread_id: string }).thread_id)
  if (threadIds.length === 0) {
    return NextResponse.json({
      newAnnouncements: 0,
      eventsThisWeek: 0,
      unreadChatCount: 0,
    })
  }

  // Unread: messages in my threads where created_at > my last_read_at and sender != me
  for (const m of members ?? []) {
    const row = m as { thread_id: string; last_read_at: string | null }
    const lastReadAt = row.last_read_at ?? "1970-01-01T00:00:00Z"
    const { count } = await admin
      .from("messaging_messages")
      .select("*", { count: "exact", head: true })
      .eq("thread_id", row.thread_id)
      .neq("sender_id", user.id)
      .gt("created_at", lastReadAt)
    unreadChatCount += count ?? 0
  }

  // New announcements: type = announcement in my threads, last 7 days
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: annCount } = await admin
    .from("messaging_messages")
    .select("*", { count: "exact", head: true })
    .in("thread_id", threadIds)
    .eq("type", "announcement")
    .gte("created_at", weekAgo)
  newAnnouncements = annCount ?? 0

  // Events this week: from national_team_event_registrations we don't have event dates in DB easily.
  // Use a placeholder: 0 or derive from a future events table. For MVP use 0.
  const eventsThisWeek = 0

  return NextResponse.json({
    newAnnouncements,
    eventsThisWeek,
    unreadChatCount,
  } as ForYouResponse)
}
