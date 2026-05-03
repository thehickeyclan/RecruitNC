import type { Metadata } from "next"
import { getFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"
import { FundraisingHero } from "./components/FundraisingHero"
import { CampaignCards } from "./components/CampaignCards"
import { AthleteLeaderboard } from "./components/AthleteLeaderboard"
import { DonorActivityFeed } from "./components/DonorActivityFeed"
import { HowItWorks } from "./components/HowItWorks"
import { FundraisingFooter } from "./components/FundraisingFooter"
import { CorporateSponsors } from "./components/CorporateSponsors"

export const metadata: Metadata = {
  title: "Fundraising | NC United Wrestling",
  description:
    "Tax-deductible 501(c)(3) fundraising for NC United Wrestling athletes — live totals, campaigns, and donor activity.",
}

export default async function FundraisingPortalHomePage() {
  const snapshot = await getFundraisingHubSnapshot()

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0B2545]">
      <FundraisingHero hero={snapshot.hero} />
      <CorporateSponsors />
      <CampaignCards campaigns={snapshot.campaigns} />
      <AthleteLeaderboard rows={snapshot.leaderboard} />
      <DonorActivityFeed initial={snapshot.activity} />
      <HowItWorks />
      <FundraisingFooter />
    </div>
  )
}
