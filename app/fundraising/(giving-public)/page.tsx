import type { Metadata } from "next"
import { getFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"

/** Hub hero, leaderboard, and feeds read Stripe + Supabase — must not serve a stale RSC shell from the full route cache. */
export const dynamic = "force-dynamic"
import { fetchDonorHallOfFameFromStripe, DONOR_RECOGNITION_MIN_AMOUNT_CENTS } from "@/lib/fundraising/donor-hall-of-fame"
import { FundraisingHero } from "@/app/fundraising/components/FundraisingHero"
import { ActiveCampaigns } from "@/app/fundraising/components/ActiveCampaigns"
import { LeaderboardPreview } from "@/app/fundraising/components/LeaderboardPreview"
import { LiveDonationStream } from "@/app/fundraising/components/LiveDonationStream"
import { WhyNCUnited } from "@/app/fundraising/components/WhyNCUnited"
import { TopDonorsPreview } from "@/app/fundraising/components/top-donors-preview"
import { CorporatePartners } from "@/app/fundraising/components/CorporatePartners"
import { HowItWorks } from "@/app/fundraising/components/HowItWorks"
import { ScholarshipsSoonSection } from "@/app/fundraising/components/scholarships-soon-section"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"

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

  const leaderboardRows = snapshot.leaderboard.map((r, i) => ({ ...r, rank: i + 1 }))
  const liveFeedInitial = snapshot.activity

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0B2545] text-white">
      <FundraisingHero hero={snapshot.hero} />
      <HowItWorks />
      <ScholarshipsSoonSection />
      <CorporatePartners />
      <WhyNCUnited hero={snapshot.hero} />
      <LeaderboardPreview rows={leaderboardRows} hubTransparency={snapshot.hubTransparency} />
      <LiveDonationStream
        initial={liveFeedInitial}
        hubTransparency={snapshot.hubTransparency}
        creditCorrections={snapshot.creditCorrections}
      />
      <ActiveCampaigns campaigns={snapshot.campaigns} />
      <TopDonorsPreview
        individuals={hallOfFame?.individuals ?? []}
        organizations={hallOfFame?.organizations ?? []}
        minAmountCents={hallOfFame?.minAmountCents ?? DONOR_RECOGNITION_MIN_AMOUNT_CENTS}
      />
      <FundraisingFooter />
    </div>
  )
}
