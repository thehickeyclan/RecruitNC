import { HeroSection } from "./components/hero-section"
import { MissionBar } from "./components/mission-bar"
import { SpartanMetricsProvider } from "./components/spartan-metrics-provider"
import { SupporterActivitySection } from "./components/supporter-activity-section"
import { HowItWorksSection } from "./components/how-it-works-section"
import { LastYearSection } from "./components/last-year-section"
import { AboutSection } from "./components/about-section"
import { AboutThisRaceSection } from "./components/about-this-race-section"
import { RaceTiersGrid } from "./components/race-tiers-grid"
import { FundraisingGuideSection } from "./components/fundraising-guide-section"
import { DonationSection } from "./components/donation-section"
import { PartnersFooter } from "./components/partners-footer"

export default function SpartanPage() {
  return (
    <SpartanMetricsProvider>
      <HeroSection />
      <MissionBar />
      <SupporterActivitySection />
      <HowItWorksSection />
      <LastYearSection />
      <AboutSection />
      <AboutThisRaceSection />
      <RaceTiersGrid />
      <DonationSection />
      <FundraisingGuideSection />
      <PartnersFooter />
    </SpartanMetricsProvider>
  )
}
