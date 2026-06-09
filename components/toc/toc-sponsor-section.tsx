import { Eye, GraduationCap, Radio, Sparkles, Trophy } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TocActiveSponsors } from "@/components/toc/toc-active-sponsors"
import { TocSponsorForm } from "@/components/toc/toc-sponsor-form"
import { TOC_CONTACT_EMAIL, TOC_SPONSORSHIP, TOC_SPONSOR_TIERS } from "@/lib/toc/constants"

const BULLET_ICONS = [Eye, Radio, GraduationCap, Sparkles, Trophy] as const

export function TocSponsorSection() {
  return (
    <section id="sponsors" className="relative scroll-mt-20 py-16 md:py-20 bg-[#f4f5f7] border-t-4 border-[#CC0000]">
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto px-4 max-w-6xl pt-4">
        <TocActiveSponsors />

        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div>
            <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
              {TOC_SPONSORSHIP.eyebrow}
            </p>
            <TocVarsityHeading as="h2" className="text-4xl md:text-5xl mb-4">
              {TOC_SPONSORSHIP.headline}
            </TocVarsityHeading>
            <p className="text-[#0B1D3A]/90 text-lg leading-relaxed mb-8">{TOC_SPONSORSHIP.lead}</p>

            <ul className="space-y-4 mb-8">
              {TOC_SPONSORSHIP.bullets.map((line, index) => {
                const Icon = BULLET_ICONS[index] ?? Trophy
                return (
                  <li key={line} className="flex gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1D3A] text-white">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="text-[#0B1D3A]/85 text-base leading-relaxed pt-1.5">{line}</p>
                  </li>
                )
              })}
            </ul>

            <div className="rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-5">
              <p className={`text-[#0B1D3A] text-sm font-semibold uppercase tracking-wide mb-3 ${tocDisplayClass()}`}>
                Sponsorship tiers
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {TOC_SPONSOR_TIERS.map(({ label, description }) => (
                  <div key={label} className="rounded-sm bg-[#0B1D3A]/[0.04] px-3 py-2.5">
                    <p className="font-bold text-[#0B1D3A] text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Questions before you submit?{" "}
                <a href={`mailto:${TOC_CONTACT_EMAIL}`} className="text-[#CC0000] hover:underline font-medium">
                  {TOC_CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </div>

          <div className="rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-6 md:p-8 shadow-xl shadow-[#0B1D3A]/5">
            <TocVarsityHeading as="h3" className="text-2xl md:text-3xl mb-2">
              {TOC_SPONSORSHIP.formHeadline}
            </TocVarsityHeading>
            <p className="text-muted-foreground mb-6">{TOC_SPONSORSHIP.formLead}</p>
            <TocSponsorForm />
          </div>
        </div>
      </div>
    </section>
  )
}
