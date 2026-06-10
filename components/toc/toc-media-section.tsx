import { Camera, FileText, Mic, Video } from "lucide-react"
import { TocMediaForm } from "@/components/toc/toc-media-form"
import { TocPatrioticBar, TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_CONTACT_EMAIL, TOC_MEDIA } from "@/lib/toc/constants"

const BULLET_ICONS = [FileText, Mic, Camera, Video] as const

export function TocMediaSection() {
  return (
    <section id="media" className={`relative scroll-mt-20 bg-[#0B1D3A] text-white ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl pt-4">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
              {TOC_MEDIA.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="text-white mb-3 sm:mb-4">
              {TOC_MEDIA.headline}
            </TocVarsityHeading>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">{TOC_MEDIA.lead}</p>
            <ul className="space-y-4 mb-6">
              {TOC_MEDIA.bullets.map((line, index) => {
                const Icon = BULLET_ICONS[index] ?? FileText
                return (
                  <li key={line} className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#CC0000] text-white">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-white/90 text-sm sm:text-base leading-relaxed pt-1.5">{line}</p>
                  </li>
                )
              })}
            </ul>
            <p className="text-white/60 text-sm leading-relaxed">
              {TOC_MEDIA.responseNote}{" "}
              <a href={`mailto:${TOC_CONTACT_EMAIL}`} className="text-white hover:underline font-medium">
                {TOC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>

          <div className="rounded-sm border-2 border-white/10 bg-white p-5 sm:p-6 md:p-8 shadow-xl shadow-black/20">
            <TocVarsityHeading as="h3" className="text-[#0B1D3A] text-2xl sm:text-3xl mb-2">
              {TOC_MEDIA.formHeadline}
            </TocVarsityHeading>
            <p className="text-muted-foreground text-sm sm:text-base mb-6 leading-relaxed">{TOC_MEDIA.formLead}</p>
            <TocMediaForm />
            <a
              href={`mailto:${TOC_CONTACT_EMAIL}?subject=Tournament%20of%20Champions%20media%20request`}
              className="inline-flex w-full sm:w-auto items-center justify-center min-h-11 px-6 py-3 mt-6 text-sm font-semibold rounded-sm border-2 border-[#0B1D3A]/20 text-[#0B1D3A] hover:bg-[#0B1D3A]/5"
            >
              Email media team directly
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
