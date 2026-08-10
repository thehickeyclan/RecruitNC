import Image from "next/image"
import Link from "next/link"
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
            <article className="flex h-full flex-col overflow-hidden rounded-sm border-2 border-[#0B1D3A]/10 transition-colors hover:border-[#CC0000]/40">
              <a href={partner.href} target="_blank" rel="noopener noreferrer" className="group">
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
                      className="object-contain transition-transform group-hover:scale-[1.03]"
                      sizes="220px"
                    />
                  </div>
                </div>
              </a>
              <div className="flex flex-1 flex-col gap-3 bg-[#f4f5f7] px-5 py-4">
                {"tier" in partner && partner.tier ? (
                  <p className="w-fit rounded-full bg-[#D3B574] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0B1D3A]">
                    {partner.tier}
                  </p>
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#0B1D3A] text-base">{partner.name}</p>
                    {"ecosystemNote" in partner && partner.ecosystemNote ? (
                      <p className="text-xs text-[#CC0000] font-semibold mt-0.5">{partner.ecosystemNote}</p>
                    ) : null}
                  </div>
                  <a href={partner.href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${partner.name}`}>
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#CC0000] opacity-70 hover:opacity-100 mt-0.5" aria-hidden />
                  </a>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{partner.tagline}</p>
                {"awardDetails" in partner && partner.awardDetails ? (
                  <ul className="mt-1 space-y-2 border-t border-[#0B1D3A]/10 pt-3 text-xs leading-relaxed text-[#0B1D3A]/75">
                    {partner.awardDetails.map((detail) => (
                      <li key={detail} className="flex gap-2">
                        <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC0000]" aria-hidden />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {"signupLabel" in partner && partner.signupLabel ? (
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <a
                      href={partner.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-sm bg-[#CC0000] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-[#a80000]"
                    >
                      {partner.signupLabel}
                    </a>
                    <Link
                      href={partner.rulesHref}
                      className="inline-flex min-h-10 items-center justify-center rounded-sm border border-[#0B1D3A]/20 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#0B1D3A] hover:border-[#CC0000]/50"
                    >
                      Official rules
                    </Link>
                    <Link href={partner.newsHref} className="text-xs font-semibold text-[#CC0000] underline-offset-2 hover:underline">
                      Read the partnership announcement
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
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
