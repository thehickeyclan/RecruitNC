import { HandHeart } from "lucide-react"
import { TocVolunteerForm } from "@/components/toc/toc-volunteer-form"
import { TocPatrioticBar, TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_VOLUNTEER } from "@/lib/toc/constants"

export function TocVolunteerSection() {
  return (
    <section id="volunteer" className={`relative scroll-mt-20 bg-[#f8f9fb] border-y border-[#0B1D3A]/10 ${tocSectionClass()}`}>
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
              {TOC_VOLUNTEER.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="mb-4">
              {TOC_VOLUNTEER.headline}
            </TocVarsityHeading>
            <p className="text-[#0B1D3A]/90 text-base sm:text-lg leading-relaxed mb-6 sm:mb-8">
              {TOC_VOLUNTEER.lead}
            </p>
            <ul className="space-y-4">
              {TOC_VOLUNTEER.bullets.map((line) => (
                <li key={line} className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1D3A] text-white">
                    <HandHeart className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-[#0B1D3A]/85 text-sm sm:text-base leading-relaxed pt-1.5">{line}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-6 sm:p-8 border-l-4 border-l-[#CC0000]">
            <h3 className="text-lg font-semibold text-[#0B1D3A] mb-1">{TOC_VOLUNTEER.formHeadline}</h3>
            <p className="text-sm text-[#0B1D3A]/70 mb-6 leading-relaxed">{TOC_VOLUNTEER.formLead}</p>
            <TocVolunteerForm />
          </div>
        </div>
      </div>
      <TocPatrioticBar className="mt-10 sm:mt-12" />
    </section>
  )
}
