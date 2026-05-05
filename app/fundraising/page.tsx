import type { Metadata } from "next"
import { getFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"
import { FundraisingHero } from "./components/FundraisingHero"
import { FundraisingValueProps } from "./components/FundraisingValueProps"
import { CampaignCards } from "./components/CampaignCards"
import { AthleteLeaderboard } from "./components/AthleteLeaderboard"
import { DonorActivityFeed } from "./components/DonorActivityFeed"
import { HowItWorks } from "./components/HowItWorks"
import { FundraisingFooter } from "./components/FundraisingFooter"
import { CorporateSponsors } from "./components/CorporateSponsors"
import { DonorHallOfFame } from "./components/DonorHallOfFame"
import { fetchDonorHallOfFameFromStripe, DONOR_RECOGNITION_MIN_AMOUNT_CENTS } from "@/lib/fundraising/donor-hall-of-fame"

export const metadata: Metadata = {
  title: "Fundraising | NC United Wrestling",
  description:
    "501(c)(3) nonprofit fundraising for NC United Wrestling — tax documentation, athlete credits, Stripe checkout vs consumer crowdfunding. Live totals, campaigns, and donor activity.",
}

export default async function FundraisingPortalHomePage() {
  const [snapshot, hallOfFame] = await Promise.all([
    getFundraisingHubSnapshot(),
    fetchDonorHallOfFameFromStripe(),
  ])

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0B2545]">
      <FundraisingHero hero={snapshot.hero} hubTransparency={snapshot.hubTransparency} />
      <FundraisingValueProps hero={snapshot.hero} />
      <CorporateSponsors />
      <CampaignCards campaigns={snapshot.campaigns} />
      <AthleteLeaderboard rows={snapshot.leaderboard} hubTransparency={snapshot.hubTransparency} />
      <DonorActivityFeed initial={snapshot.activity} hubTransparency={snapshot.hubTransparency} />
      <DonorHallOfFame
        individuals={hallOfFame?.individuals ?? []}
        organizations={hallOfFame?.organizations ?? []}
        minAmountCents={hallOfFame?.minAmountCents ?? DONOR_RECOGNITION_MIN_AMOUNT_CENTS}
      />
      <HowItWorks />
      <FundraisingFooter />
    </div>
  )
}
