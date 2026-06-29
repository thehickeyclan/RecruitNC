"use client"

import { TocConfirmedFieldSection } from "@/components/toc/toc-confirmed-field-section"
import { TocHero } from "@/components/toc/toc-hero"
import { TocQuickFacts } from "@/components/toc/toc-quick-facts"
import { TocEventLogoSection } from "@/components/toc/toc-event-logo-section"
import { TocChampionJacketSection } from "@/components/toc/toc-champion-jacket-section"
import { TocStorySection } from "@/components/toc/toc-story-section"
import { TocAthleteQuotesSection } from "@/components/toc/toc-athlete-quotes-section"
import { TocVenueSection } from "@/components/toc/toc-venue-section"
import { TocOfficialsSection } from "@/components/toc/toc-officials-section"
import { TocFinalsMatSection } from "@/components/toc/toc-finals-mat-section"
import { TocSpectatorsSection } from "@/components/toc/toc-spectators-section"
import { TocWeightClassesList } from "@/components/toc/toc-weight-classes"
import { TocScheduleTable } from "@/components/toc/toc-schedule-table"
import { TocStreamingSection } from "@/components/toc/toc-streaming-section"
import { TocMediaSection } from "@/components/toc/toc-media-section"
import { TocNominationForm } from "@/components/toc/toc-nomination-form"
import { TocSponsorSection } from "@/components/toc/toc-sponsor-section"
import { TocFaq } from "@/components/toc/toc-faq"
import { TocAboutNcUnitedSection } from "@/components/toc/toc-about-nc-united-section"
import { TocEmailSignup } from "@/components/toc/toc-email-signup"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_CONTACT_EMAIL } from "@/lib/toc/constants"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
}

export function TocLandingPage({ config }: Props) {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <TocHero config={config} />
      <TocQuickFacts />
      <TocEventLogoSection />
      <TocConfirmedFieldSection />
      <TocChampionJacketSection />
      <TocStorySection />
      <TocAthleteQuotesSection />
      <TocVenueSection config={config} />
      <TocOfficialsSection />
      <TocSpectatorsSection />
      <TocFinalsMatSection />
      <TocWeightClassesList />
      <TocScheduleTable />
      <TocStreamingSection config={config} />
      <TocMediaSection />

      <section id="email-signup" className="py-12 sm:py-16 bg-[#0B1D3A] relative scroll-mt-20">
        <TocPatrioticBar className="absolute top-0 left-0 right-0" />
        <div className="container mx-auto w-full px-4 sm:px-6 max-w-2xl text-center pt-4">
          <TocVarsityHeading as="h2" className="text-white mb-2">
            Stay in the loop
          </TocVarsityHeading>
          <p className="text-white/70 text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed">
            Invite list news, streaming link, tickets, and everything leading up to championship weekend.
          </p>
          <div className="flex justify-center w-full">
            <TocEmailSignup source="landing_section" />
          </div>
        </div>
      </section>

      <section id="athlete-interest" className="py-12 sm:py-16 md:py-20 border-t-4 border-[#CC0000] scroll-mt-20">
        <div className="container mx-auto w-full px-4 sm:px-6 max-w-xl">
          <TocVarsityHeading as="h2" className="mb-2">
            Athlete interest form
          </TocVarsityHeading>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8 leading-relaxed">
            Top NC prospects — tell us your name, school, club, and the weight you&apos;d compete at. We use this to plan
            invitations and may reach out. <strong>Submitting does not guarantee an invitation.</strong>
          </p>
          <TocNominationForm />
        </div>
      </section>

      <TocSponsorSection />

      <TocFaq />

      <TocAboutNcUnitedSection />

      <footer className="relative bg-[#060f1f] text-center text-white/70 text-sm py-8 sm:py-10 px-4">
        <TocPatrioticBar className="absolute top-0 left-0 right-0" />
        <p className={`text-white text-lg mt-4 ${tocDisplayClass()}`}>NC United Tournament of Champions</p>
        <p className="mt-2">{config.event_dates}</p>
        <p className="mt-1">{config.venue_name}</p>
        <p className="mt-1 text-white/55">{config.venue_address ?? "Apex, NC"}</p>
        <p className="mt-4">
          <a
            href={`mailto:${TOC_CONTACT_EMAIL}`}
            className="text-white/70 hover:text-white underline underline-offset-2"
          >
            {TOC_CONTACT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  )
}
