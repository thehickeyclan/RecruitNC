import type { Metadata } from "next"
import { getFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"
import { FundraisingHero } from "./components/FundraisingHero"
import { CampaignCards } from "./components/CampaignCards"
import { AthleteLeaderboard } from "./components/AthleteLeaderboard"
import { DonorActivityFeed } from "./components/DonorActivityFeed"
import { HowItWorks } from "./components/HowItWorks"
import { FundraisingFooter } from "./components/FundraisingFooter"
import { CorporateSponsors } from "./components/CorporateSponsors"
import { DonorHallOfFame } from "./components/DonorHallOfFame"
import { fetchDonorHallOfFameFromStripe } from "@/lib/fundraising/donor-hall-of-fame"

export const metadata: Metadata = {
  title: "Fundraising | NC United Wrestling",
  description:
    "Tax-deductible 501(c)(3) fundraising for NC United Wrestling athletes — live totals, campaigns, and donor activity.",
}

export default async function FundraisingPortalHomePage() {
  const [snapshot, hallOfFame] = await Promise.all([
    getFundraisingHubSnapshot(),
    fetchDonorHallOfFameFromStripe(),
  ])

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0B2545]">
      <FundraisingHero hero={snapshot.hero} />
      <CorporateSponsors />
      <DonorHallOfFame
        individuals={hallOfFame?.individuals ?? []}
        organizations={hallOfFame?.organizations ?? []}
      />
      <CampaignCards campaigns={snapshot.campaigns} />
      <AthleteLeaderboard rows={snapshot.leaderboard} />
      <DonorActivityFeed initial={snapshot.activity} />
      <HowItWorks />
      <FundraisingFooter />
    </div>
  )
}
