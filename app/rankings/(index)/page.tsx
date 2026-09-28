import { redirect } from "next/navigation"

import { RankingsSalesClient } from "./rankings-sales-client"
import { resolveRankingViewer } from "@/lib/ranking-access"
import { canSeeProspectRanking } from "@/lib/ranking-visibility"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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
export default async function RankingsIndexPage() {
  const { viewer } = await resolveRankingViewer({
    supabase: await createClient(),
    admin: createAdminClient(),
  })

  if (canSeeProspectRanking(viewer)) redirect("/public-rankings")

  return <RankingsSalesClient />
}
