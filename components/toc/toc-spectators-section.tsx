import { Car, Coffee, Shield, Ticket, Users } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_SPECTATORS, TOC_TICKET_SALE_MONTH } from "@/lib/toc/constants"

const EXPECTATION_ICONS = [Car, Coffee, Shield, Users, Users, Users] as const

export function TocSpectatorsSection() {
  return (
    <section id="families" className="relative scroll-mt-20 py-16 md:py-20 bg-white border-y border-[#0B1D3A]/10">
      <div className="container mx-auto px-4 max-w-6xl">
        <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
          {TOC_SPECTATORS.eyebrow}
        </p>
        <TocVarsityHeading as="h2" className="text-4xl md:text-5xl mb-4">
          {TOC_SPECTATORS.headline}
        </TocVarsityHeading>
        <p className="text-[#0B1D3A]/90 text-lg leading-relaxed mb-10 max-w-3xl">{TOC_SPECTATORS.lead}</p>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h3 className={`text-[#0B1D3A] text-lg mb-4 ${tocDisplayClass()}`}>What to expect</h3>
            <ul className="space-y-3">
              {TOC_SPECTATORS.expectations.map((line, index) => {
                const Icon = EXPECTATION_ICONS[index] ?? Users
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
            <div>
              <h3 className={`text-[#0B1D3A] text-lg mb-4 ${tocDisplayClass()}`}>Two ways to attend</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
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
              <a
                href="#email-signup"
                className={`inline-flex mt-4 items-center justify-center rounded-sm bg-[#CC0000] px-5 py-2.5 text-sm text-white hover:bg-[#a80000] transition-colors ${tocDisplayClass()}`}
              >
                Get ticket updates
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
