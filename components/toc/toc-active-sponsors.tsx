import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_ACTIVE_SPONSORS } from "@/lib/toc/constants"

export function TocActiveSponsors() {
  if (TOC_ACTIVE_SPONSORS.length === 0) return null

  return (
    <div className="mb-12 rounded-sm border-2 border-[#0B1D3A]/10 bg-white p-6 md:p-8 shadow-lg shadow-[#0B1D3A]/5">
      <p className={`text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2 ${tocDisplayClass()}`}>
        Active sponsors
      </p>
      <p className="text-[#0B1D3A]/80 text-sm md:text-base mb-6 max-w-3xl">
        Proud partners already on board for championship weekend — brands aligned with NC wrestling performance and
        development.
      </p>

      <ul className="grid gap-5 md:grid-cols-2 list-none p-0 m-0">
        {TOC_ACTIVE_SPONSORS.map((sponsor) => (
          <li key={sponsor.name}>
            <a
              href={sponsor.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-sm border-2 border-[#0B1D3A]/10 overflow-hidden hover:border-[#CC0000]/40 transition-colors"
            >
              <div
                className={`flex items-center justify-center px-6 py-8 ${
                  sponsor.logoTheme === "dark" ? "bg-[#060f1f]" : "bg-white"
                }`}
              >
                <div className="relative h-20 w-full max-w-[220px]">
                  <Image
                    src={sponsor.logoUrl}
                    alt={`${sponsor.name} logo`}
                    fill
                    className="object-contain"
                    sizes="220px"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 bg-[#f4f5f7] px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-[#0B1D3A] text-base">{sponsor.name}</p>
                  <ExternalLink
                    className="h-4 w-4 shrink-0 text-[#CC0000] opacity-70 group-hover:opacity-100 mt-0.5"
                    aria-hidden
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{sponsor.tagline}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
