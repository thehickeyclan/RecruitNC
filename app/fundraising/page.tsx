import type { Metadata } from "next"
import { getFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"
import { fetchDonorHallOfFameFromStripe, DONOR_RECOGNITION_MIN_AMOUNT_CENTS } from "@/lib/fundraising/donor-hall-of-fame"
import { FundraisingHero } from "./components/FundraisingHero"
import { NavigationPaths } from "./components/NavigationPaths"
import { ActiveCampaigns } from "./components/ActiveCampaigns"
import { LeaderboardPreview } from "./components/LeaderboardPreview"
import { LiveDonationStream } from "./components/LiveDonationStream"
import { WhyNCUnited } from "./components/WhyNCUnited"
import { HonorRollPreview } from "./components/HonorRollPreview"
import { CorporatePartners } from "./components/CorporatePartners"
import { HowItWorks } from "./components/HowItWorks"
import { FundraisingFooter } from "./components/FundraisingFooter"

export const metadata: Metadata = {
  title: "Give | NC United Wrestling",
  description:
    "Tax-deductible 501(c)(3) gifts to NC United Wrestling — support a wrestler or the training fund, secure checkout, leaderboards, and public gift activity. EIN 99-3757238.",
}

export default async function FundraisingPortalHomePage() {
  const [snapshot, hallOfFame] = await Promise.all([
    getFundraisingHubSnapshot(),
    fetchDonorHallOfFameFromStripe(),
  ])

  const leaderboardPreview = snapshot.leaderboard.slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 }))
  const liveFeedInitial = snapshot.activity.slice(0, 15)

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0B2545] text-white">
      <FundraisingHero hero={snapshot.hero} hubTransparency={snapshot.hubTransparency} />
      <NavigationPaths />
      <HowItWorks />
      <ActiveCampaigns campaigns={snapshot.campaigns} />
      <LeaderboardPreview rows={leaderboardPreview} hubTransparency={snapshot.hubTransparency} />
      <LiveDonationStream initial={liveFeedInitial} hubTransparency={snapshot.hubTransparency} />
      <WhyNCUnited hero={snapshot.hero} />
      <HonorRollPreview
        individuals={hallOfFame?.individuals ?? []}
        organizations={hallOfFame?.organizations ?? []}
        minAmountCents={hallOfFame?.minAmountCents ?? DONOR_RECOGNITION_MIN_AMOUNT_CENTS}
      />
      <CorporatePartners />
      <FundraisingFooter />
    </div>
  )
}
