import Image from "next/image"
import { Radio, ExternalLink } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocMobileCtaClass, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_FLO_URL, TOC_STREAMING } from "@/lib/toc/constants"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
}

export function TocStreamingSection({ config }: Props) {
  // An admin-set watch link still wins, so a direct event-day stream URL can replace the event page.
  const watchUrl = config.watch_live_url?.trim() || TOC_FLO_URL

  return (
    <section id="streaming" className={`relative scroll-mt-20 bg-[#060f1f] text-white ${tocSectionClass()}`}>
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-3xl text-center pt-2">
        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#CC0000] mb-4">
          <Radio className="h-3.5 w-3.5" aria-hidden />
          {TOC_STREAMING.headline}
        </div>
        <TocVarsityHeading as="h2" className="text-white mb-3">
          Watch from anywhere
        </TocVarsityHeading>
        <p className="text-white/85 text-base sm:text-lg leading-relaxed mb-2">{TOC_STREAMING.teaser}</p>
        <p className="text-white/60 text-sm mb-6">Commentary: {TOC_STREAMING.commentator}</p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${tocMobileCtaClass("primary")} gap-2`}
        >
          <Image src="/images/flo-logo.png" alt="" width={20} height={20} className="h-5 w-5 rounded" />
          Watch on FloWrestling
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </section>
  )
}
