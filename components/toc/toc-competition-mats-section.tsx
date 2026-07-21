import Image from "next/image"
import { TOC_BRAND, TOC_COMPETITION_MATS } from "@/lib/toc/constants"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"

export function TocCompetitionMatsSection() {
  return (
    <section id="competition-mats" className="relative overflow-hidden bg-[#060f1f] text-white">
      <TocPatrioticBar />
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(215,185,90,0.35), transparent 28%),
            radial-gradient(circle at 80% 35%, rgba(204,0,0,0.28), transparent 26%)`,
        }}
        aria-hidden
      />

      <div className="container relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className={`mb-2 text-sm uppercase tracking-[0.22em] text-[#D7B95A] ${tocDisplayClass()}`}>
              {TOC_COMPETITION_MATS.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="max-w-3xl text-white leading-none lg:text-6xl">
              {TOC_COMPETITION_MATS.headline}
            </TocVarsityHeading>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
              The competition surface is part of the event experience: two new 42×42 navy blue mats with a prominent
              white NC United logo at center, ordered for the Tournament of Champions stage.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {TOC_COMPETITION_MATS.items.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <span className="mb-3 block h-1 w-10 rounded-full bg-[#D7B95A]" aria-hidden />
                  <p className="text-sm leading-relaxed text-white/85">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="relative overflow-hidden rounded-2xl border border-white/15 p-3 shadow-2xl"
              style={{ backgroundColor: TOC_BRAND.navy }}
            >
              <Image
                src={TOC_COMPETITION_MATS.rendering.src}
                alt={TOC_COMPETITION_MATS.rendering.alt}
                width={TOC_COMPETITION_MATS.rendering.width}
                height={TOC_COMPETITION_MATS.rendering.height}
                className="h-auto w-full rounded-xl bg-white object-contain"
                sizes="(min-width: 1024px) 42vw, 100vw"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-xl">
              <p className={`mb-3 text-center text-xs uppercase tracking-[0.2em] text-slate-500 ${tocDisplayClass()}`}>
                {TOC_COMPETITION_MATS.partnerLabel}
              </p>
              <Image
                src={TOC_COMPETITION_MATS.resiliteLogo.src}
                alt={TOC_COMPETITION_MATS.resiliteLogo.alt}
                width={TOC_COMPETITION_MATS.resiliteLogo.width}
                height={TOC_COMPETITION_MATS.resiliteLogo.height}
                className="h-auto w-full object-contain"
                sizes="(min-width: 1024px) 34vw, 90vw"
              />
            </div>
          </div>
        </div>
      </div>

      <TocPatrioticBar />
    </section>
  )
}
