import { NextResponse, type NextRequest } from "next/server"
import { getPublicRankingsMax, isPublicRankingsYearPublished } from "@/lib/public-rankings-cap"
import { resolveRankingViewerForUser } from "@/lib/ranking-access"
import { resolveRequestUserId } from "@/lib/request-user"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * The ranks for the athlete directory, and the only place they are served for it.
 *
 * The directory's rows are public and cached, and they used to carry every wrestler's
 * `prospect_ranking` - unreleased classes included - with the page hiding the number from
 * anyone not entitled to it. Hidden is not withheld: the whole board was in the response for
 * anybody who opened it. The rows no longer carry a rank at all; an entitled viewer asks here.
 *
 * Entitled is admins, verified college coaches, NC United Blue families and subscribers
 * (Matt, 12 October 2026: "nobody else should have access"), decided on the server from the
 * session. Only published classes, and only down to each class's published depth.
 */
export async function GET(request: NextRequest) {
  const admin = createAdminClient()
  // Cookie session on the web, bearer token from the app.
  const userId = await resolveRequestUserId(request)
  if (!userId) return NextResponse.json({ error: "Sign in to see rankings." }, { status: 401 })
  const { viewer } = await resolveRankingViewerForUser({ admin, userId })
  if (!canSeeProspectRanking(viewer)) return NextResponse.json({ error: "Rankings are not included for this account." }, { status: 403 })

  const { data, error } = await admin
    .from("athletes")
    .select("id, graduationyear, prospect_ranking, gender")
    .not("prospect_ranking", "is", null)
    .gte("prospect_ranking", 1)
    .limit(5000)
  if (error) return NextResponse.json({ error: "Could not load rankings." }, { status: 500 })

  const ranks: Record<string, number> = {}
  for (const row of data ?? []) {
    const year = Number(row.graduationyear)
    const rank = Number(row.prospect_ranking)
    if (!isPublicRankingsYearPublished(year, row.gender) || !Number.isFinite(rank)) continue
    if (rank > getPublicRankingsMax(year, row.gender)) continue
    ranks[String(row.id)] = rank
  }
  return NextResponse.json({ ranks }, { headers: { "Cache-Control": "private, no-store" } })
}
