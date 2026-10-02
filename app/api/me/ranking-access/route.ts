import { NextResponse } from "next/server"

import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Just enough about the viewer for a cached page to show the right prompt.
 *
 * /athletes is cached for everyone, so it cannot render a per-person banner server-side. This
 * answers two booleans and nothing else - no names, no entitlement detail - so the directory can
 * tell a coach the rankings exist without the page itself becoming per-viewer.
 */

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { viewer } = await resolveRankingViewer({
      supabase: await createClient(),
      admin: createAdminClient(),
    })
    return NextResponse.json({
      hasRankings: canSeeProspectRanking(viewer),
      isCoach: viewer.isVerifiedCoach === true,
    })
  } catch {
    return NextResponse.json({ hasRankings: false, isCoach: false })
  }
}
