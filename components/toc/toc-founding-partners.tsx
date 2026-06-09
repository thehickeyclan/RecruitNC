import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_FOUNDING_PARTNERS } from "@/lib/toc/constants"

export function TocFoundingPartners() {
  const { eyebrow, lead, urgency, ctaLabel, ctaHref, partners } = TOC_FOUNDING_PARTNERS

  return (
    <div className="mb-12 rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-6 md:p-8 shadow-lg shadow-[#0B1D3A]/5">
      <p className={`text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2 ${tocDisplayClass()}`}>
        {eyebrow}
      </p>
      <p className="text-[#0B1D3A]/90 text-base md:text-lg mb-6 max-w-3xl leading-relaxed">{lead}</p>

      <ul className="grid gap-5 md:grid-cols-2 list-none p-0 m-0 mb-6">
        {partners.map((partner) => (
          <li key={partner.name}>
            <a
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-sm border-2 border-[#0B1D3A]/10 overflow-hidden hover:border-[#CC0000]/40 transition-colors"
            >
              <div
                className={`flex items-center justify-center px-6 py-8 ${
                  partner.logoTheme === "dark" ? "bg-[#060f1f]" : "bg-white"
                }`}
              >
                <div className="relative h-20 w-full max-w-[220px]">
                  <Image
                    src={partner.logoUrl}
                    alt={`${partner.name} logo`}
                    fill
                    className="object-contain"
                    sizes="220px"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 bg-[#f4f5f7] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0B1D3A] text-base">{partner.name}</p>
                    {"ecosystemNote" in partner && partner.ecosystemNote ? (
                      <p className="text-xs text-[#CC0000] font-medium mt-0.5">{partner.ecosystemNote}</p>
                    ) : null}
                  </div>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 text-[#CC0000] opacity-70 group-hover:opacity-100 mt-0.5"
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{partner.tagline}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <p className="text-sm font-semibold text-[#0B1D3A] mb-4">{urgency}</p>
      <a href={ctaHref} className={tocMobileCtaClass("primary")}>
        {ctaLabel}
      </a>
    </div>
  )
}

/** @deprecated use TocFoundingPartners */
export const TocActiveSponsors = TocFoundingPartners
