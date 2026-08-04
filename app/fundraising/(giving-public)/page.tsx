import type { Metadata } from "next"
import { getFundraisingHubSnapshot } from "@/lib/fundraising/hub-data"

/** Giving totals read Stripe + Supabase — do not serve a stale RSC shell from the full route cache. */
export const dynamic = "force-dynamic"
import { fetchDonorHallOfFameFromStripe, DONOR_RECOGNITION_MIN_AMOUNT_CENTS } from "@/lib/fundraising/donor-hall-of-fame"
import { FundraisingHero } from "@/app/fundraising/components/FundraisingHero"
import { WhyNCUnited } from "@/app/fundraising/components/WhyNCUnited"
import { TopDonorsPreview } from "@/app/fundraising/components/top-donors-preview"
import { CorporatePartners } from "@/app/fundraising/components/CorporatePartners"
import { HowItWorks } from "@/app/fundraising/components/HowItWorks"
import { ScholarshipsSoonSection } from "@/app/fundraising/components/scholarships-soon-section"
import { FundraisingFooter } from "@/app/fundraising/components/FundraisingFooter"

export const metadata: Metadata = {
  title: "Give | NC United Wrestling",
  description:
    "Support NC United Wrestling's charitable mission or explore separately governed scholarship funds. NC United is a 501(c)(3), EIN 99-3757238.",
}

export default async function FundraisingPortalHomePage() {
  const [snapshot, hallOfFame] = await Promise.all([
    getFundraisingHubSnapshot(),
    fetchDonorHallOfFameFromStripe(),
  ])

  return (
    <div id="fundraising-hub-root" className="min-h-screen bg-[#0B2545] text-white">
      <FundraisingHero hero={snapshot.hero} />
      <HowItWorks />
      <ScholarshipsSoonSection />
      <CorporatePartners />
      <WhyNCUnited hero={snapshot.hero} />
      <TopDonorsPreview
        individuals={hallOfFame?.individuals ?? []}
        organizations={hallOfFame?.organizations ?? []}
        minAmountCents={hallOfFame?.minAmountCents ?? DONOR_RECOGNITION_MIN_AMOUNT_CENTS}
      />
      <FundraisingFooter />
    </div>
  )
}
