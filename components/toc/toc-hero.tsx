"use client"

import Image from "next/image"
import { TocAiRenderingCaption } from "@/components/toc/toc-ai-rendering-caption"
import { TocCountdown } from "@/components/toc/toc-countdown"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_EVENT_DATE, TOC_HERO_DATES } from "@/lib/toc/constants"
import { TOC_HERO } from "@/lib/toc/marketing-copy"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
}

const SECONDARY_LINKS = [
  { href: "#venue", label: "Venue" },
  { href: "#schedule", label: "Schedule" },
  { href: "#families", label: "Tickets & families" },
  { href: "#sponsors", label: "Sponsorship" },
] as const

export function TocHero({ config }: Props) {
  const ctaHref = config.hero_primary_cta_href.startsWith("#")
    ? config.hero_primary_cta_href
    : config.hero_primary_cta_href

  return (
    <section className="relative bg-[#0B1D3A] text-white">
      <div className="relative z-10">
        <TocPatrioticBar />
        <div className="container relative mx-auto w-full px-4 sm:px-6 py-14 sm:py-16 md:py-20 max-w-6xl">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="max-w-xl">
              <p className="text-[#CC0000] text-xs sm:text-sm tracking-[0.2em] uppercase font-semibold mb-5 sm:mb-6">
                NC United · By invitation only
              </p>

              <p
                className={`text-5xl sm:text-6xl md:text-7xl text-white leading-[0.92] ${tocDisplayClass()}`}
              >
                {TOC_HERO_DATES.headline}
              </p>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-white/70 font-semibold uppercase tracking-[0.14em]">
                {TOC_HERO_DATES.subline}
              </p>
              <p className="mt-2 text-sm sm:text-base text-white/50">
                {config.venue_name ?? "Hope Community Church"}, Apex
              </p>

              <h1
                className={`mt-8 sm:mt-10 text-4xl sm:text-5xl md:text-6xl text-white leading-[0.95] ${tocDisplayClass()}`}
              >
                {TOC_HERO.eventName}
              </h1>
              <p
                className={`mt-3 sm:mt-4 text-xl sm:text-2xl md:text-3xl text-white/95 leading-tight ${tocDisplayClass()}`}
              >
                {TOC_HERO.tagline}
              </p>

              <TocCountdown targetDate={TOC_EVENT_DATE} className="mt-8 sm:mt-10 justify-start" />

              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <a href={ctaHref} className={tocMobileCtaClass("primary")}>
                  {config.hero_primary_cta_label}
                </a>
                <a href="#champion-jacket" className={tocMobileCtaClass("secondary")}>
                  The Champion jacket
                </a>
              </div>

              <nav
                className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/60"
                aria-label="Jump to event sections"
              >
                {SECONDARY_LINKS.map(({ href, label }) => (
                  <a key={href} href={href} className="hover:text-white hover:underline">
                    {label}
                  </a>
                ))}
                <a href="#athlete-interest" className="hover:text-white hover:underline">
                  Athlete interest
                </a>
              </nav>
            </div>

            <div className="w-full max-w-xl lg:max-w-none lg:justify-self-end">
              <div className="relative overflow-hidden rounded-sm border-2 border-white/10 shadow-xl shadow-black/20">
                <Image
                  src="/images/toc/venue-apex-arena.png"
                  alt="NC United Tournament of Champions venue — Hope Community Church Apex"
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  priority
                />
              </div>
              <TocAiRenderingCaption variant="dark" />
            </div>
          </div>
        </div>
        <TocPatrioticBar />
      </div>
    </section>
  )
}
