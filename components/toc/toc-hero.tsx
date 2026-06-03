"use client"

import { TocCountdown } from "@/components/toc/toc-countdown"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_EVENT_DATE } from "@/lib/toc/constants"
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
        <p className={`text-white/80 text-base md:text-lg mb-2 ${tocDisplayClass()}`}>
          North Carolina · September 2026
        </p>
        <h1 className={`text-5xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl text-white ${tocDisplayClass()}`}>
          Tournament of Champions
        </h1>
        <p className="mt-6 text-xl md:text-2xl text-white font-medium max-w-2xl border-l-4 border-[#CC0000] pl-4">
          Who is the best wrestler in North Carolina at each weight?
        </p>
        <p className="mt-4 text-white/75 max-w-2xl text-base md:text-lg">
          {config.event_dates} · {config.venue_name ?? "Hope Community Church"}, Apex · 88 wrestlers · 11 college
          weights · top-4 earn the Champion jacket
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
            href="#nominate"
            className="inline-flex items-center justify-center rounded-sm border-2 border-white/40 px-6 py-3.5 text-base font-semibold text-white/90 hover:border-white transition-colors"
          >
            Nominate an athlete
          </a>
        </div>
      </div>
      <TocPatrioticBar />
    </section>
  )
}
