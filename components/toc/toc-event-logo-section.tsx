import Image from "next/image"
import { TocPatrioticBar } from "@/components/toc/toc-theme"
import { TOC_EVENT_LOGO } from "@/lib/toc/constants"

export function TocEventLogoSection() {
  return (
    <section className="border-y border-[#0B1D3A]/10 bg-[#f8f9fb]">
      <TocPatrioticBar />
      <div className="container mx-auto w-full px-4 sm:px-6 py-10 sm:py-12 max-w-6xl">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <Image
            src={TOC_EVENT_LOGO.src}
            alt={TOC_EVENT_LOGO.alt}
            width={TOC_EVENT_LOGO.width}
            height={TOC_EVENT_LOGO.height}
            className="h-auto w-full max-w-[17rem] sm:max-w-xs drop-shadow-md"
            sizes="(min-width: 640px) 20rem, 17rem"
          />
          <p className="mt-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-[#0B1D3A]/55">
            Official event mark · Invite only
          </p>
        </div>
      </div>
      <TocPatrioticBar />
    </section>
  )
}
