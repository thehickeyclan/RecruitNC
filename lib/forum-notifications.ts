import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Insert an in-app notification when a user is added to a forum group.
 * Call from POST /api/forum/groups/[groupId]/members and sync-event after inserting forum_members.
 */
export async function notifyForumGroupAdded(
  admin: SupabaseClient,
  userId: string,
  groupId: string
): Promise<void> {
  const { data: group } = await admin
    .from("forum_groups")
    .select("id, name")
    .eq("id", groupId)
    .single()
  if (!group) return

  const groupName = (group as { name: string }).name

  const { data: channel } = await admin
    .from("forum_channels")
    .select("id")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const link = channel
    ? `/forum/groups/${groupId}/channels/${(channel as { id: string }).id}`
    : `/forum`

  await admin.from("user_notifications").insert({
    user_id: userId,
    type: "forum_group_added",
    title: `Added to ${groupName}`,
    body: `You were added to the community group "${groupName}".`,
    link,
  })
}
