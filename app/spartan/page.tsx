import { HeroSection } from "./components/hero-section"
import { MissionBar } from "./components/mission-bar"
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
      <LastYearSection />
      <AboutSection />
      <RaceTiersGrid />
      <DonationSection />
      <PartnersFooter />
    </>
  )
}
