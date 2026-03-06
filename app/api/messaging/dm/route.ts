import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMessagingUser } from "@/lib/messaging-auth"

export const dynamic = "force-dynamic"

/**
 * POST: Get or create a direct message thread between the current user and another user.
 * Body: { other_user_id: string }
 * Returns: { threadId, name }
 */
export async function POST(request: Request) {
  const user = await getMessagingUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { other_user_id?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const otherUserId = typeof body.other_user_id === "string" ? body.other_user_id.trim() : ""
  if (!otherUserId) return NextResponse.json({ error: "other_user_id is required" }, { status: 400 })
  if (otherUserId === user.id) return NextResponse.json({ error: "Cannot start a DM with yourself" }, { status: 400 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Find existing DM: threads where type='dm', I'm a member, and the only other member is otherUserId
  const { data: myMemberships } = await admin
    .from("messaging_thread_members")
    .select("thread_id")
    .eq("user_id", user.id)
  const myThreadIds = (myMemberships ?? []).map((m) => (m as { thread_id: string }).thread_id)
  if (myThreadIds.length === 0) {
    // No threads; create new DM below
  } else {
    const { data: dmThreads } = await admin
      .from("messaging_threads")
      .select("id, name")
      .in("id", myThreadIds)
      .eq("type", "dm")
    if (dmThreads?.length) {
      for (const thread of dmThreads) {
        const { data: members } = await admin
          .from("messaging_thread_members")
          .select("user_id")
          .eq("thread_id", thread.id)
        const userIds = (members ?? []).map((r) => (r as { user_id: string }).user_id)
        if (userIds.length === 2 && userIds.includes(user.id) && userIds.includes(otherUserId)) {
          return NextResponse.json({ threadId: thread.id, name: (thread as { name?: string }).name ?? "Direct message" })
        }
      }
    }
  }

  // Create new DM thread and add both members
  const { data: otherProfile } = await admin
    .from("user_profiles")
    .select("full_name, first_name, last_name, email")
    .eq("user_id", otherUserId)
    .maybeSingle()
  const otherName =
    (otherProfile as { full_name?: string | null })?.full_name?.trim() ||
    [(otherProfile as { first_name?: string | null })?.first_name, (otherProfile as { last_name?: string | null })?.last_name].filter(Boolean).join(" ").trim() ||
    (otherProfile as { email?: string | null })?.email ||
    "Direct message"

  const { data: newThread, error: threadErr } = await admin
    .from("messaging_threads")
    .insert({
      type: "dm",
      name: otherName,
      context_type: null,
      context_id: null,
      created_by_user_id: user.id,
      created_at: now,
      last_message_at: now,
    })
    .select("id, name")
    .single()

  if (threadErr || !newThread) {
    console.error("[messaging/dm] create thread", threadErr)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }

  const threadId = (newThread as { id: string }).id
  const { error: insertErr } = await admin.from("messaging_thread_members").insert([
    { thread_id: threadId, user_id: user.id, role: "member", notification_level: "all", joined_at: now },
    { thread_id: threadId, user_id: otherUserId, role: "member", notification_level: "all", joined_at: now },
  ])

  if (insertErr) {
    console.error("[messaging/dm] insert members", insertErr)
    await admin.from("messaging_threads").delete().eq("id", threadId)
    return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 })
  }

  return NextResponse.json({
    threadId,
    name: (newThread as { name?: string }).name ?? "Direct message",
  })
}
