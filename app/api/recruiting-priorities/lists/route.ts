import { NextRequest, NextResponse } from "next/server"

import { priorityLists } from "@/app/my-recruiting/priority-lists"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { hasPortalAccess } from "@/lib/ranking-visibility"
import { familyFocus } from "@/lib/recruiting/family-focus"
import { respondentFor } from "@/lib/recruiting/priorities/store"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * The survey's last screen (Matt, 6 Nov 2026): five colleges we think may fit, to react to before
 * "Go to the map". The same lists the Command Center home shows, for the signed-in parent or
 * wrestler only (respondentFor), never a coach or a "view as". Stored like the home page's, so a
 * reaction here ties to the batch the family saw.
 */
export async function GET(req: NextRequest) {
  const athleteId = req.nextUrl.searchParams.get("athleteId") ?? ""
  if (!athleteId) return NextResponse.json({ error: "athleteId required" }, { status: 400 })
  const admin = createAdminClient()
  const { viewer, userId } = await resolveRankingViewer({ supabase: await createClient(), admin })
  if (!userId || !hasPortalAccess(viewer)) return NextResponse.json({ error: "Not available" }, { status: 403 })
  if (!(await respondentFor(admin, userId, athleteId).catch(() => null))) return NextResponse.json({ error: "Not available" }, { status: 403 })
  const focus = await familyFocus(admin, userId).catch(() => null)
  const lists = await priorityLists(admin, { viewerId: userId, athleteId, team: focus?.gender ?? null, includeViews: true, store: true }).catch((e) => {
    console.error("[priorities/lists]", e)
    return null
  })
  return NextResponse.json({ lists })
}
