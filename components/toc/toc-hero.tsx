"use client"

import Image from "next/image"
import { TocCountdown } from "@/components/toc/toc-countdown"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_EVENT_DATE, TOC_EVENT_LOGO, TOC_HERO_DATES } from "@/lib/toc/constants"
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
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <Image
          src="/images/toc/venue-apex-arena.png"
          alt=""
          fill
          priority
          className="object-cover object-center scale-105"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0B1D3A]/82" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1D3A]/95 via-[#0B1D3A]/88 to-[#060f1f]/90" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(204,0,0,0.12) 0%, transparent 45%), linear-gradient(225deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <TocPatrioticBar />
        <div className="container relative mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 md:py-24 max-w-6xl">
          <p className="text-[#CC0000] text-xs sm:text-sm md:text-base mb-4 sm:mb-6 tracking-[0.18em] sm:tracking-[0.2em] uppercase font-semibold text-center lg:text-left">
            NC United · By invitation only
          </p>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,17rem)_1fr] xl:grid-cols-[minmax(0,20rem)_1fr] lg:items-center lg:gap-10 xl:gap-14 mb-6 sm:mb-8">
            <h1 className="mx-auto w-full max-w-[13rem] sm:max-w-[15rem] lg:max-w-none lg:mx-0">
              <Image
                src={TOC_EVENT_LOGO.src}
                alt={TOC_EVENT_LOGO.alt}
                width={TOC_EVENT_LOGO.width}
                height={TOC_EVENT_LOGO.height}
                className="h-auto w-full drop-shadow-2xl"
                sizes="(min-width: 1024px) 20rem, 15rem"
                priority
              />
            </h1>

            <div className="text-center lg:text-left">
              <p
                className={`text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl text-white leading-[0.95] ${tocDisplayClass()}`}
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
          </div>

          <p
            className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl text-white max-w-3xl leading-tight text-center lg:text-left mx-auto lg:mx-0 ${tocDisplayClass()}`}
          >
            {TOC_HERO.tagline}
          </p>
          <p
            className={`mt-2 sm:mt-3 text-base sm:text-lg md:text-xl text-white/85 max-w-3xl text-center lg:text-left mx-auto lg:mx-0 ${tocDisplayClass()}`}
          >
            {TOC_HERO.buckleUp}
          </p>

          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed text-center lg:text-left mx-auto lg:mx-0">
            {TOC_HERO.lead}{" "}
            <strong className="text-white font-semibold block sm:inline mt-1 sm:mt-0">{TOC_HERO.showLine}</strong>
          </p>

          <TocCountdown targetDate={TOC_EVENT_DATE} className="mt-6 sm:mt-8 justify-center lg:justify-start" />

          <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
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
      </div>
    </section>
  )
}
