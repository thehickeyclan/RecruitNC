import { TocPatrioticBar, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_NC_UNITED_ABOUT } from "@/lib/toc/constants"

export function TocAboutNcUnitedSection() {
  return (
    <section id="about-nc-united" className={`relative bg-[#f4f5f7] border-t border-[#0B1D3A]/10 scroll-mt-20 ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-3xl pt-4 text-center">
        <h2 className="text-[#0B1D3A] font-bold text-lg sm:text-xl md:text-2xl mb-3">{TOC_NC_UNITED_ABOUT.headline}</h2>
        <p className="text-[#0B1D3A]/85 text-sm sm:text-base leading-relaxed mb-4">{TOC_NC_UNITED_ABOUT.body}</p>
        <a
          href={TOC_NC_UNITED_ABOUT.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#CC0000] font-semibold hover:underline"
        >
          {TOC_NC_UNITED_ABOUT.linkLabel}
        </a>
      </div>
    </section>
  )
}
