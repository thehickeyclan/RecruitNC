import { Armchair, Car, GraduationCap, Heart, Shield, Ticket, UtensilsCrossed } from "lucide-react"
import { TocVarsityHeading, tocDisplayClass, tocMobileCtaClass, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_SPECTATORS, TOC_TICKET_SALE_MONTH } from "@/lib/toc/constants"

const EXPECTATION_ICONS = [Car, Armchair, Shield, Shield, GraduationCap] as const

export function TocSpectatorsSection() {
  const { concessions } = TOC_SPECTATORS

  return (
    <section id="families" className={`relative scroll-mt-20 bg-white border-y border-[#0B1D3A]/10 ${tocSectionClass()}`}>
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl">
        <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
          {TOC_SPECTATORS.eyebrow}
        </p>
        <TocVarsityHeading as="h2" className="mb-3 sm:mb-4">
          {TOC_SPECTATORS.headline}
        </TocVarsityHeading>
        <p className="text-[#0B1D3A]/90 text-base sm:text-lg leading-relaxed mb-8 sm:mb-10 max-w-3xl">{TOC_SPECTATORS.lead}</p>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h3 className={`text-[#0B1D3A] text-lg mb-4 ${tocDisplayClass()}`}>What to expect</h3>
            <ul className="space-y-3">
              {TOC_SPECTATORS.expectations.map((line, index) => {
                const Icon = EXPECTATION_ICONS[index] ?? Shield
                return (
                  <li key={line} className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#0B1D3A]/10 text-[#0B1D3A]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-[#0B1D3A]/85 text-sm md:text-base leading-relaxed pt-0.5">{line}</p>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="space-y-6">
            <div className="rounded-sm border-2 border-[#CC0000]/30 bg-[#f8f9fb] p-5 sm:p-6 border-l-4 border-l-[#CC0000]">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#CC0000] text-white">
                  <UtensilsCrossed className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <h3 className={`text-[#0B1D3A] text-lg ${tocDisplayClass()}`}>{concessions.headline}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#CC0000] mt-1">
                    {TOC_SPECTATORS.concessionsHours}
                  </p>
                </div>
              </div>
              <p className="text-[#0B1D3A]/85 text-sm sm:text-base leading-relaxed mb-4">{concessions.lead}</p>
              <ul className="space-y-2 mb-4">
                {concessions.highlights.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-[#0B1D3A]/85 leading-relaxed">
                    <Heart className="h-4 w-4 shrink-0 text-[#CC0000] mt-0.5" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold text-[#0B1D3A] leading-relaxed rounded-sm bg-white border border-[#0B1D3A]/10 px-3 py-2.5">
                {concessions.venuePolicy}
              </p>
            </div>

            <div>
              <h3 className={`text-[#0B1D3A] text-lg mb-4 ${tocDisplayClass()}`}>
                {TOC_SPECTATORS.ticketSectionTitle}
              </h3>
              <div className="grid gap-4">
                {TOC_SPECTATORS.ticketOptions.map(({ title, description }) => (
                  <div
                    key={title}
                    className="rounded-sm border-2 border-[#0B1D3A]/10 bg-[#f8f9fb] p-5 border-l-4 border-l-[#CC0000]"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Ticket className="h-5 w-5 text-[#CC0000] shrink-0 mt-0.5" aria-hidden />
                      <p className="font-bold text-[#0B1D3A] text-sm uppercase tracking-wide">{title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-7">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border-2 border-[#0B1D3A]/10 bg-[#0B1D3A] p-5 text-white">
              <p className="text-white/90 text-sm leading-relaxed">
                Tickets on sale <strong className="text-white">{TOC_TICKET_SALE_MONTH}</strong>. Pricing to be
                announced. Sign up below for first access.
              </p>
              <a href="#email-signup" className={`${tocMobileCtaClass("primary")} mt-4 text-sm`}>
                Get ticket updates
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
