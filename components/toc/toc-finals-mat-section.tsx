import Image from "next/image"
import { Mic2, Sparkles, Trophy } from "lucide-react"
import { TocAiRenderingCaption } from "@/components/toc/toc-ai-rendering-caption"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_FINALS_MAT } from "@/lib/toc/constants"

const BULLET_ICONS = [Mic2, Sparkles, Trophy] as const

export function TocFinalsMatSection() {
  return (
    <section id="finals" className={`relative bg-[#060f1f] text-white scroll-mt-20 ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl pt-4">
        <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
              {TOC_FINALS_MAT.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="text-white mb-3 sm:mb-4">
              {TOC_FINALS_MAT.headline}
            </TocVarsityHeading>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">{TOC_FINALS_MAT.lead}</p>
            <ul className="space-y-4">
              {TOC_FINALS_MAT.bullets.map((line, index) => {
                const Icon = BULLET_ICONS[index] ?? Trophy
                return (
                  <li key={line} className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#CC0000] text-white">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className={`text-white/90 text-base leading-relaxed pt-1.5 ${tocDisplayClass()}`}>{line}</p>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div>
              <div className="relative overflow-hidden rounded-sm border-2 border-white/10 shadow-2xl shadow-black/40">
                <Image
                  src="/images/toc/finals-single-mat.png"
                  alt="Single-mat championship finals — spotlight on the center mat with NC United branding"
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 40vw, 100vw"
                />
              </div>
              <TocAiRenderingCaption variant="dark" />
            </div>
            <div>
              <div className="relative overflow-hidden rounded-sm border-2 border-white/10 shadow-2xl shadow-black/40">
                <Image
                  src="/images/toc/finals-announcements.png"
                  alt="Finalist introductions and single-mat competition under arena lighting"
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 40vw, 100vw"
                />
              </div>
              <TocAiRenderingCaption variant="dark" />
            </div>
          </div>
        </div>
      </div>
      <TocPatrioticBar className="absolute bottom-0 left-0 right-0" />
    </section>
  )
}
