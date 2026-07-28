import type { Metadata } from "next"
import { Suspense } from "react"
import { FUNDRAISING_CAMPAIGNS } from "@/lib/fundraising/campaign-registry"
import { FundraisingActivityClient } from "./activity-client"

export const metadata: Metadata = {
  title: "Donor activity | NC United Fundraising",
  description:
    "Aggregate NC United fundraising activity by campaign, without publishing individual supporter transactions.",
}

function ActivityFallback() {
  return (
    <div className="min-h-[50vh] bg-slate-100 pb-16 pt-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-slate-200/80" />
      </div>
    </div>
  )
}

export default function FundraisingActivityPage() {
  const campaigns = FUNDRAISING_CAMPAIGNS.map((c) => ({
    stripeCampaignSlug: c.stripeCampaignSlug,
    tabLabel: c.tabLabel,
    publicPagePath: c.publicPagePath,
    campaignDisplayName: c.campaignDisplayName,
  }))

  return (
    <Suspense fallback={<ActivityFallback />}>
      <FundraisingActivityClient campaigns={campaigns} />
    </Suspense>
  )
}
