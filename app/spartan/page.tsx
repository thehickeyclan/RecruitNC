import { AthleteDedicationSection } from "./components/athlete-dedication-section"
import { HeroSection } from "./components/hero-section"
import { MissionBar } from "./components/mission-bar"
import { HowItWorksSection } from "./components/how-it-works-section"
import { LastYearSection } from "./components/last-year-section"
import { AboutSection } from "./components/about-section"
import { RaceTiersGrid } from "./components/race-tiers-grid"
import { DonationSection } from "./components/donation-section"
import { PartnersFooter } from "./components/partners-footer"

export default function SpartanCampaignPage() {
  return (
    <>
      <HeroSection />
      <MissionBar />
      <HowItWorksSection />
      <LastYearSection />
      <AboutSection />
      <RaceTiersGrid />
      <AthleteDedicationSection />
      <DonationSection />
      <PartnersFooter />
    </>
  )
}
