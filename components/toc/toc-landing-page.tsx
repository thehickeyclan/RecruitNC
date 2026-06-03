"use client"

import { TocHero } from "@/components/toc/toc-hero"
import { TocQuickFacts } from "@/components/toc/toc-quick-facts"
import { TocChampionJacketSection } from "@/components/toc/toc-champion-jacket-section"
import { TocStorySection } from "@/components/toc/toc-story-section"
import { TocWeightClassesList } from "@/components/toc/toc-weight-classes"
import { TocRecruitingSection } from "@/components/toc/toc-recruiting-section"
import { TocNominationForm } from "@/components/toc/toc-nomination-form"
import { TocSponsorForm } from "@/components/toc/toc-sponsor-form"
import { TocFaq } from "@/components/toc/toc-faq"
import { TocEmailSignup } from "@/components/toc/toc-email-signup"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import type { TocConfirmedCollege } from "@/lib/toc/confirmed-colleges"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
  confirmedColleges?: TocConfirmedCollege[]
}

export function TocLandingPage({ config, confirmedColleges = [] }: Props) {
  return (
    <div className="min-h-screen bg-white">
      <TocHero config={config} />
      <TocQuickFacts />
      <TocChampionJacketSection />
      <TocStorySection />
      <TocWeightClassesList />

      <section id="email-signup" className="py-16 bg-[#0B1D3A] relative">
        <TocPatrioticBar className="absolute top-0 left-0 right-0" />
        <div className="container mx-auto px-4 max-w-2xl text-center pt-4">
          <TocVarsityHeading as="h2" className="text-4xl text-white mb-2">
            Stay in the loop
          </TocVarsityHeading>
          <p className="text-white/70 mb-8">
            Field announcements, ticket sales, and Champion jacket reveal updates.
          </p>
          <div className="flex justify-center">
            <TocEmailSignup source="landing_section" />
          </div>
        </div>
      </section>

      <section id="nominate" className="py-16 md:py-20 border-t-4 border-[#CC0000]">
        <div className="container mx-auto px-4 max-w-xl">
          <TocVarsityHeading as="h2" className="text-4xl mb-2">
            Nominate an athlete
          </TocVarsityHeading>
          <p className="text-muted-foreground mb-8">
            Know a wrestler who belongs in the field? Submit a nomination for staff review. Nominations do not guarantee
            an invitation.
          </p>
          <TocNominationForm />
        </div>
      </section>

      <TocRecruitingSection confirmedColleges={confirmedColleges} />

      <section id="sponsors" className="py-16 md:py-20 bg-[#f4f5f7]">
        <div className="container mx-auto px-4 max-w-xl">
          <TocVarsityHeading as="h2" className="text-4xl mb-2">
            Partner with us
          </TocVarsityHeading>
          <p className="text-muted-foreground mb-8">
            Title, Champion, Partner, and Community sponsorship opportunities for brands aligned with NC wrestling.
          </p>
          <TocSponsorForm />
        </div>
      </section>

      <TocFaq />

      <footer className="relative bg-[#060f1f] text-center text-white/70 text-sm py-10">
        <TocPatrioticBar className="absolute top-0 left-0 right-0" />
        <p className={`text-white text-lg mt-4 ${tocDisplayClass()}`}>NC United Tournament of Champions</p>
        <p className="mt-2">{config.event_dates}</p>
        <p className="mt-1">{config.venue_name} · Apex, NC</p>
      </footer>
    </div>
  )
}
