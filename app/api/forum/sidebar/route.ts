import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export type ForumChannel = { id: string; name: string; type: string; coach_only: boolean }
export type ForumGroup = { id: string; name: string; visibility: string; logo_url?: string | null; channels: ForumChannel[] }
export type ForumDmConversation = { id: string; type: string; last_message_at: string | null }
export type LegacyDm = { id: string; name: string; unread_count: number }

const DEFAULT_FORUM_GROUP_NAMES = ["NHSCA Duals 2026", "NHSCA Duals 2026 - Select"]

/** Ensure a forum group exists by name; create with general channel and add user as admin if missing. */
async function ensureForumGroup(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  name: string,
  userId: string
): Promise<void> {
  const { data: existing } = await admin
    .from("forum_groups")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle()
  if (existing) return

  const { data: group, error: groupErr } = await admin
    .from("forum_groups")
    .insert({ name, visibility: "public", created_by: userId })
    .select("id")
    .single()
  if (groupErr || !group) return

  const groupId = (group as { id: string }).id
  await admin.from("forum_channels").insert({
    group_id: groupId,
    name: "general",
    type: "chat",
    position: 0,
    coach_only: false,
  })
  await admin.from("forum_members").upsert(
    { group_id: groupId, user_id: userId, role: "admin" },
    { onConflict: "group_id,user_id", ignoreDuplicates: true }
  )
}

/**
 * GET /api/forum/sidebar
 * Returns groups (with channels), forum DM conversations, and legacy messaging DMs for the current user.
 * All forum groups are shown. If none exist, ensures default event groups (NHSCA Duals 2026, etc.) exist so they appear.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const [dmRes, legacyDmRes] = await Promise.all([
    supabase
      .from("forum_dm_participants")
      .select("conversation_id")
      .eq("user_id", user.id),
    supabase
      .from("messaging_thread_members")
      .select("thread_id")
      .eq("user_id", user.id),
  ])

  const conversationIds = (dmRes.data ?? []).map((r) => (r as { conversation_id: string }).conversation_id)
  const legacyThreadIds = (legacyDmRes.data ?? []).map((r) => (r as { thread_id: string }).thread_id)

  let groups: ForumGroup[] = []
  let allGroupRows = (await admin.from("forum_groups").select("id, name, visibility, logo_url")).data ?? []
  if (allGroupRows.length === 0) {
    for (const name of DEFAULT_FORUM_GROUP_NAMES) {
      await ensureForumGroup(admin, name, user.id)
    }
    allGroupRows = (await admin.from("forum_groups").select("id, name, visibility, logo_url")).data ?? []
  }
  const allIds = allGroupRows.map((r) => (r as { id: string }).id)
  if (allIds.length > 0) {
    const groupsById = new Map<string, ForumGroup>()
    for (const g of allGroupRows ?? []) {
      const row = g as { id: string; name: string; visibility: string; logo_url?: string | null }
      groupsById.set(row.id, { id: row.id, name: row.name, visibility: row.visibility, logo_url: row.logo_url ?? null, channels: [] })
    }
    const { data: channelRows } = await admin
      .from("forum_channels")
      .select("id, group_id, name, type, coach_only")
      .in("group_id", allIds)
      .order("position", { ascending: true })
    for (const c of channelRows ?? []) {
      const row = c as { id: string; group_id: string; name: string; type: string; coach_only: boolean }
      const group = groupsById.get(row.group_id)
      if (group) {
        group.channels.push({
          id: row.id,
          name: row.name,
          type: row.type,
          coach_only: row.coach_only ?? false,
        })
      }
    }
    groups = [...groupsById.values()]
    groups.sort((a, b) => a.name.localeCompare(b.name))
  }

  let dmConversations: ForumDmConversation[] = []
  if (conversationIds.length > 0) {
    const { data: convRows } = await supabase
      .from("forum_dm_conversations")
      .select("id, type, last_message_at")
      .in("id", conversationIds)
      .order("last_message_at", { ascending: false })
    dmConversations = (convRows ?? []).map((r) => ({
      id: (r as { id: string }).id,
      type: (r as { type: string }).type,
      last_message_at: (r as { last_message_at: string | null }).last_message_at,
    }))
  }

  let legacyDms: LegacyDm[] = []
  if (legacyThreadIds.length > 0) {
    const { data: threadRows } = await supabase
      .from("messaging_threads")
      .select("id, name")
      .in("id", legacyThreadIds)
      .eq("type", "dm")
      .order("last_message_at", { ascending: false })
    const { data: memberRows } = await supabase
      .from("messaging_thread_members")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id)
      .in("thread_id", legacyThreadIds)
    const lastReadByThread = new Map<string, string | null>()
    for (const m of memberRows ?? []) {
      const row = m as { thread_id: string; last_read_at: string | null }
      lastReadByThread.set(row.thread_id, row.last_read_at ?? null)
    }
    const { data: msgRows } = await supabase
      .from("messaging_messages")
      .select("thread_id, created_at, sender_id")
      .in("thread_id", legacyThreadIds)
      .neq("sender_id", user.id)
    const unreadByThread = new Map<string, number>()
    for (const tid of legacyThreadIds) unreadByThread.set(tid, 0)
    for (const msg of msgRows ?? []) {
      const row = msg as { thread_id: string; created_at: string; sender_id: string }
      const lastRead = lastReadByThread.get(row.thread_id) ?? "1970-01-01T00:00:00Z"
      if (new Date(row.created_at).getTime() > new Date(lastRead).getTime()) {
        unreadByThread.set(row.thread_id, (unreadByThread.get(row.thread_id) ?? 0) + 1)
      }
    }
    legacyDms = (threadRows ?? []).map((r) => ({
      id: (r as { id: string }).id,
      name: (r as { name?: string | null }).name ?? "Direct message",
      unread_count: unreadByThread.get((r as { id: string }).id) ?? 0,
    }))
  }

  return NextResponse.json({ groups, dmConversations, legacyDms })
}
