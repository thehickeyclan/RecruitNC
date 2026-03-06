import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export type ForumChannel = { id: string; name: string; type: string; coach_only: boolean }
export type ForumGroup = { id: string; name: string; visibility: string; channels: ForumChannel[] }
export type ForumDmConversation = { id: string; type: string; last_message_at: string | null }

/**
 * GET /api/forum/sidebar
 * Returns groups (with channels) and DM conversations for the current user.
 * RLS on forum_* tables filters by membership.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [groupsRes, dmRes] = await Promise.all([
    supabase
      .from("forum_members")
      .select("group_id")
      .eq("user_id", user.id),
    supabase
      .from("forum_dm_participants")
      .select("conversation_id")
      .eq("user_id", user.id),
  ])

  const groupIds = (groupsRes.data ?? []).map((r) => (r as { group_id: string }).group_id)
  const conversationIds = (dmRes.data ?? []).map((r) => (r as { conversation_id: string }).conversation_id)

  if (groupIds.length === 0 && conversationIds.length === 0) {
    return NextResponse.json({ groups: [], dmConversations: [] })
  }

  const groups: ForumGroup[] = []
  if (groupIds.length > 0) {
    const { data: groupRows } = await supabase
      .from("forum_groups")
      .select("id, name, visibility")
      .in("id", groupIds)
    const groupsById = new Map<string | null, ForumGroup>()
    for (const g of groupRows ?? []) {
      const row = g as { id: string; name: string; visibility: string }
      groupsById.set(row.id, { id: row.id, name: row.name, visibility: row.visibility, channels: [] })
    }

    const { data: channelRows } = await supabase
      .from("forum_channels")
      .select("id, group_id, name, type, coach_only")
      .in("group_id", groupIds)
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

    for (const g of groupRows ?? []) {
      const row = g as { id: string }
      const group = groupsById.get(row.id)
      if (group) groups.push(group)
    }
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

  return NextResponse.json({ groups, dmConversations })
}
