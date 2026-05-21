import type { SupabaseClient } from "@supabase/supabase-js"
import {
  isMissingNhscaHubMediaLikesTableError,
  NHSCA_HUB_MEDIA_LIKES_TABLE,
  type NhscaHubMediaRow,
} from "@/lib/nhsca-hub-media"

export async function enrichNhscaHubMediaWithLikes(
  admin: SupabaseClient,
  items: NhscaHubMediaRow[],
  userId: string | null
): Promise<NhscaHubMediaRow[]> {
  if (items.length === 0) return items

  const ids = items.map((i) => i.id)
  const { data, error } = await admin
    .from(NHSCA_HUB_MEDIA_LIKES_TABLE)
    .select("media_id, user_id")
    .in("media_id", ids)

  if (error) {
    if (isMissingNhscaHubMediaLikesTableError(error.message)) {
      return items.map((i) => ({ ...i, like_count: 0, liked_by_me: false }))
    }
    throw error
  }

  const counts = new Map<string, number>()
  const liked = new Set<string>()
  for (const row of data ?? []) {
    const mediaId = row.media_id as string
    counts.set(mediaId, (counts.get(mediaId) ?? 0) + 1)
    if (userId && row.user_id === userId) liked.add(mediaId)
  }

  return items.map((i) => ({
    ...i,
    like_count: counts.get(i.id) ?? 0,
    liked_by_me: liked.has(i.id),
  }))
}
