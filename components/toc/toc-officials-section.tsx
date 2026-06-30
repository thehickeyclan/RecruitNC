import Image from "next/image"
import { Scale, Shield, Timer, Users } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_ELITE_OFFICIALS } from "@/lib/toc/constants"

const BULLET_ICONS = [Users, Timer, Scale, Shield] as const

export function TocOfficialsSection() {
  return (
    <section id="officials" className={`relative scroll-mt-20 bg-white border-y border-[#0B1D3A]/10 ${tocSectionClass()}`}>
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
              {TOC_ELITE_OFFICIALS.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="mb-2">
              {TOC_ELITE_OFFICIALS.headline}
            </TocVarsityHeading>
            <p className="text-[#0B1D3A]/70 text-sm font-semibold uppercase tracking-wide mb-4">
              {TOC_ELITE_OFFICIALS.role}
            </p>
            <p className="text-[#0B1D3A]/90 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
              {TOC_ELITE_OFFICIALS.lead}
            </p>
            <ul className="space-y-4">
              {TOC_ELITE_OFFICIALS.bullets.map((line, index) => {
                const Icon = BULLET_ICONS[index] ?? Shield
                return (
                  <li key={line} className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1D3A] text-white">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-[#0B1D3A]/85 text-sm sm:text-base leading-relaxed pt-1.5">{line}</p>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="overflow-hidden rounded-sm border-2 border-[#0B1D3A]/10 bg-[#f8f9fb] border-l-4 border-l-[#CC0000]">
            <div className="relative aspect-[3/4] w-full bg-[#0B1D3A]/5">
              <Image
                src="/images/toc/jonathan-sutton.png"
                alt="Jonathan Sutton — chief of officials for NC United Tournament of Champions"
                width={600}
                height={820}
                className="h-full w-full object-cover object-top"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
            </div>
            <div className="p-6 sm:p-8">
            <p className={`text-[#0B1D3A] text-xl sm:text-2xl mb-3 ${tocDisplayClass()}`}>Jonathan Sutton</p>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-wide mb-4">Chief of officials</p>
            <p className="text-[#0B1D3A]/85 text-sm sm:text-base leading-relaxed">
              Sutton leads an elite crew built for high-stakes brackets — fair calls and professional standards from
              weigh-in through the last championship bout.
            </p>
            <a
              href="#venue"
              className="inline-block mt-5 text-sm font-semibold text-[#CC0000] hover:underline"
            >
              Coaches & Officials Lounge →
            </a>
            </div>
          </div>
        </div>
      </div>
      <TocPatrioticBar className="mt-10 sm:mt-12" />
    </section>
  )
}
