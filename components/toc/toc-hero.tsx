"use client"

import { TocCountdown } from "@/components/toc/toc-countdown"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_EVENT_DATE, TOC_HERO_DATES } from "@/lib/toc/constants"
import { TOC_HERO } from "@/lib/toc/marketing-copy"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
}

const SECONDARY_LINKS = [
  { href: "#venue", label: "The venue" },
  { href: "#finals", label: "Championship finals" },
  { href: "#families", label: "Families & fans" },
  { href: "#schedule", label: "Event schedule" },
  { href: "#sponsors", label: "Sponsorship" },
  { href: "#athlete-interest", label: "Athlete interest form" },
] as const

export function TocHero({ config }: Props) {
  const ctaHref = config.hero_primary_cta_href.startsWith("#")
    ? config.hero_primary_cta_href
    : config.hero_primary_cta_href

  return (
    <section className="relative overflow-hidden bg-[#0B1D3A] text-white">
      <TocPatrioticBar />
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(204,0,0,0.15) 0%, transparent 40%), linear-gradient(225deg, rgba(255,255,255,0.06) 0%, transparent 50%)",
        }}
      />
      <div className="container relative mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 md:py-24 max-w-5xl">
        <p className="text-[#CC0000] text-xs sm:text-sm md:text-base mb-3 tracking-[0.18em] sm:tracking-[0.2em] uppercase font-semibold">
          NC United · By invitation only
        </p>

        <div className="mb-5 sm:mb-7">
          <p
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[0.95] ${tocDisplayClass()}`}
          >
            {TOC_HERO_DATES.headline}
          </p>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base md:text-lg text-white/75 font-semibold uppercase tracking-[0.12em] sm:tracking-[0.16em]">
            {TOC_HERO_DATES.subline}
          </p>
          <p className="mt-2 text-sm sm:text-base text-white/55">
            {config.venue_name ?? "Hope Community Church"}, Apex
          </p>
        </div>

        <h1
          className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl text-white ${tocDisplayClass()}`}
        >
          {TOC_HERO.eventName}
        </h1>
        <p
          className={`mt-3 sm:mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white max-w-3xl leading-tight ${tocDisplayClass()}`}
        >
          {TOC_HERO.tagline}
        </p>
        <p className={`mt-2 sm:mt-3 text-base sm:text-lg md:text-xl text-white/85 max-w-3xl ${tocDisplayClass()}`}>
          {TOC_HERO.buckleUp}
        </p>

        <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed">
          {TOC_HERO.lead}{" "}
          <strong className="text-white font-semibold block sm:inline mt-1 sm:mt-0">{TOC_HERO.showLine}</strong>
        </p>

        <TocCountdown targetDate={TOC_EVENT_DATE} className="mt-6 sm:mt-8 justify-center sm:justify-start" />

        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 sm:gap-4">
          <a href={ctaHref} className={tocMobileCtaClass("primary")}>
            {config.hero_primary_cta_label}
          </a>
          <a href="#champion-jacket" className={tocMobileCtaClass("secondary")}>
            The Champion jacket
          </a>
          {SECONDARY_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className={tocMobileCtaClass("ghost")}>
              {label}
            </a>
          ))}
        </div>
      </div>
      <TocPatrioticBar />
    </section>
  )
}
