import type { Metadata } from "next"
import { Suspense } from "react"
import { FUNDRAISING_CAMPAIGNS } from "@/lib/fundraising/campaign-registry"
import { FundraisingLeaderboardContent, LeaderboardSkeleton } from "./leaderboard-client"

export const metadata: Metadata = {
  title: "NC United Training Fund — athlete contributions | NC United Fundraising",
  description:
    "Paid Training Fund supporter checkout attributed to wrestlers — NC United transparency. Contribution totals reflect charitable gifts documented in wrestlers' names toward the NC United Training Fund.",
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
