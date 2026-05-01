import type { Metadata } from "next"
import { Suspense } from "react"
import { FUNDRAISING_CAMPAIGNS } from "@/lib/fundraising/campaign-registry"
import { FundraisingLeaderboardContent, LeaderboardSkeleton } from "./leaderboard-client"

export const metadata: Metadata = {
  title: "Fundraising leaderboard | NC United",
  description:
    "Athlete totals from paid NC United fundraising gifts. Anonymous donor preferences are respected on supporter feeds.",
}

export default function FundraisingLeaderboardPage() {
  const campaigns = FUNDRAISING_CAMPAIGNS.map((c) => ({
    stripeCampaignSlug: c.stripeCampaignSlug,
    campaignDisplayName: c.campaignDisplayName,
    tabLabel: c.tabLabel,
    defaultLookbackDays: c.defaultLookbackDays,
  }))

  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <FundraisingLeaderboardContent campaigns={campaigns} />
    </Suspense>
  )
}
