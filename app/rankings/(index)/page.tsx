import { redirect } from "next/navigation"

import { RankingsSalesClient } from "./rankings-sales-client"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { recentCollegeViewStats } from "@/lib/college-view-signal"
import { loadTopHundred } from "@/lib/rankings/top-100-view"

// Per viewer: which of the two things this route does depends entirely on who is asking.
export const dynamic = "force-dynamic"

/**
 * /rankings and /public-rankings must end in the same place.
 *
 * They did not. /public-rankings is the hub, listing every board; /rankings rendered a single
 * Class of 2027 table for anyone with access, because the only thing it ever fetched was
 * `year=2027`. Both links were shared in the same announcement, so two people following the
 * same message saw two different products, and the one who landed here reasonably concluded
 * the 2028, 2029 and Top 75 boards did not exist.
 *
 * So this route now answers one question - can you see rankings? - and sends you to the hub if
 * you can. What is left here is the sales page, which is the right answer for everybody else.
 *
 * No redirect loop: /public-rankings sends viewers *without* access here, and this sends
 * viewers *with* access there. A viewer is one or the other, never both.
 */
export default async function RankingsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })

  if (canSeeProspectRanking(viewer)) {
    /*
     * Keep the query. A new coach is sent to /rankings?welcome=coach and the welcome modal opens
     * from that flag; dropping it here meant no coach ever saw the modal (2 Oct-3 Oct 2026).
     */
    const params = (await searchParams) ?? {}
    const carried = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (typeof v === "string") carried.set(k, v)
    const query = carried.toString()
    redirect(query ? `/public-rankings?${query}` : "/public-rankings")
  }

  // The reason a parent pays: college coaches are looking. Counted, cached for an hour.
  // Which classes the Top 75 holds is read off the published board, so the copy can't drift from it.
  const [collegeViews, topBoard] = await Promise.all([
    recentCollegeViewStats(createAdminClient()).catch(() => null),
    loadTopHundred("Male").catch(() => null),
  ])
  return <RankingsSalesClient collegeViews={collegeViews} topClasses={topBoard?.classes ?? []} />
}
