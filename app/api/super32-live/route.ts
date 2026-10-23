/** The published Command Center snapshot, public. Internal fields (seen-at map, review lists) are dropped. */
import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { latestSnapshot, SUPER32_EVENT_KEY, type SnapshotData } from "@/lib/super32-live/snapshot"

export const dynamic = "force-dynamic"

export type PublicSnapshot = Omit<SnapshotData, "boutSeenAt" | "unresolved" | "unmatched" | "brackets"> & { publishedAt: string | null }

const load = unstable_cache(
  async (): Promise<PublicSnapshot | null> => {
    const snap = await latestSnapshot(createAdminClient(), SUPER32_EVENT_KEY, true)
    if (!snap) return null
    const { boutSeenAt: _a, unresolved: _b, unmatched: _c, brackets: _d, ...rest } = snap.data
    return { ...rest, publishedAt: snap.published_at }
  },
  ["super32-live-public"],
  { tags: ["super32-live"], revalidate: 30 },
)

export async function GET() {
  const data = await load()
  return NextResponse.json({ snapshot: data }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } })
}
