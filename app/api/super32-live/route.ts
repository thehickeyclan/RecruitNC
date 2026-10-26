/**
 * The published Command Center snapshot, for members only (Matt, 26 Oct 2026: "HQ should now be
 * member only": Insider, Blue, the Command Center, verified college coaches and admins). The page
 * gates too; this is the data behind it, so it cannot be read around the page. Internal fields (seen-at map, review lists) are
 * dropped. `?year=2025` returns last year's event, published once as a permanent 2025 view.
 */
import { NextResponse, type NextRequest } from "next/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess, hasPremiumAccess } from "@/lib/ranking-visibility"
import { latestSnapshot, SUPER32_EVENT_KEY, type SnapshotData } from "@/lib/super32-live/snapshot"

export const dynamic = "force-dynamic"

export type PublicSnapshot = Omit<SnapshotData, "boutSeenAt" | "unresolved" | "unmatched" | "brackets"> & { publishedAt: string | null }

const YEARS: Record<string, string> = { "2025": "super32-2025", "2026": SUPER32_EVENT_KEY }

const load = unstable_cache(
  async (eventKey: string): Promise<PublicSnapshot | null> => {
    const snap = await latestSnapshot(createAdminClient(), eventKey, true)
    if (!snap) return null
    const { boutSeenAt: _a, unresolved: _b, unmatched: _c, brackets: _d, ...rest } = snap.data
    return { ...rest, publishedAt: snap.published_at }
  },
  ["super32-live-public"],
  { tags: ["super32-live"], revalidate: 30 },
)

export async function GET(request: NextRequest) {
  const { viewer } = await resolveRankingViewer({ supabase: await createClient(), admin: createAdminClient() })
  if (!(hasPremiumAccess(viewer) || hasPortalAccess(viewer))) {
    return NextResponse.json({ error: "Super 32 HQ is for Insider, NC United Blue and college coaches." }, { status: 403, headers: { "Cache-Control": "private, no-store" } })
  }
  const eventKey = YEARS[request.nextUrl.searchParams.get("year") ?? "2026"] ?? SUPER32_EVENT_KEY
  const data = await load(eventKey)
  return NextResponse.json({ snapshot: data }, { headers: { "Cache-Control": "private, no-store" } })
}
