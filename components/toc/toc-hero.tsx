"use client"

import { TocCountdown } from "@/components/toc/toc-countdown"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_EVENT_DATE } from "@/lib/toc/constants"
import { TOC_HERO } from "@/lib/toc/marketing-copy"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
}

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
      <div className="container relative mx-auto px-4 py-16 md:py-24 max-w-5xl">
        <p className="text-[#CC0000] text-sm md:text-base mb-3 tracking-[0.2em] uppercase font-semibold">
          NC United · By invitation only
        </p>
        <h1 className={`text-5xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl text-white ${tocDisplayClass()}`}>
          {TOC_HERO.eventName}
        </h1>
        <p className={`mt-4 text-2xl md:text-3xl lg:text-4xl text-white max-w-3xl leading-tight ${tocDisplayClass()}`}>
          {TOC_HERO.tagline}
        </p>
        <p className={`mt-3 text-lg md:text-xl text-white/85 max-w-3xl ${tocDisplayClass()}`}>{TOC_HERO.buckleUp}</p>

        <p className="mt-8 text-lg md:text-xl text-white/90 max-w-3xl leading-relaxed">
          {TOC_HERO.lead}{" "}
          <strong className="text-white font-semibold">{TOC_HERO.showLine}</strong>
        </p>

        <p className="mt-4 text-white/60 text-sm md:text-base">
          {config.event_dates} · {config.venue_name ?? "Hope Community Church"}, Apex
        </p>

        <TocCountdown targetDate={TOC_EVENT_DATE} className="mt-8" />

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href={ctaHref}
            className={`inline-flex items-center justify-center rounded-sm bg-[#CC0000] px-8 py-3.5 text-lg text-white shadow-lg hover:bg-[#a80000] transition-colors ${tocDisplayClass()}`}
          >
            {config.hero_primary_cta_label}
          </a>
          <a
            href="#champion-jacket"
            className={`inline-flex items-center justify-center rounded-sm border-2 border-white px-8 py-3.5 text-lg text-white hover:bg-white/10 transition-colors ${tocDisplayClass()}`}
          >
            The Champion jacket
          </a>
          <a
            href="#venue"
            className="inline-flex items-center justify-center rounded-sm border-2 border-white/40 px-6 py-3.5 text-base font-semibold text-white/90 hover:border-white transition-colors"
          >
            The venue
          </a>
          <a
            href="#finals"
            className="inline-flex items-center justify-center rounded-sm border-2 border-white/40 px-6 py-3.5 text-base font-semibold text-white/90 hover:border-white transition-colors"
          >
            Championship finals
          </a>
          <a
            href="#schedule"
            className="inline-flex items-center justify-center rounded-sm border-2 border-white/40 px-6 py-3.5 text-base font-semibold text-white/90 hover:border-white transition-colors"
          >
            Event schedule
          </a>
          <a
            href="#sponsors"
            className="inline-flex items-center justify-center rounded-sm border-2 border-white/40 px-6 py-3.5 text-base font-semibold text-white/90 hover:border-white transition-colors"
          >
            Sponsorship
          </a>
          <a
            href="#athlete-interest"
            className="inline-flex items-center justify-center rounded-sm border-2 border-white/40 px-6 py-3.5 text-base font-semibold text-white/90 hover:border-white transition-colors"
          >
            Athlete interest form
          </a>
        </div>
      </div>
      <TocPatrioticBar />
    </section>
  )
}
