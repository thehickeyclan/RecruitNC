import { Radio, ExternalLink } from "lucide-react"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_STREAMING } from "@/lib/toc/constants"
import type { TocEventConfig } from "@/lib/toc/event-config"

type Props = {
  config: TocEventConfig
}

export function TocStreamingSection({ config }: Props) {
  const liveUrl = config.watch_live_url?.trim()

  return (
    <section id="streaming" className="relative scroll-mt-20 bg-[#060f1f] text-white py-14 md:py-16">
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto px-4 max-w-3xl text-center pt-2">
        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#CC0000] mb-4">
          <Radio className="h-3.5 w-3.5" aria-hidden />
          {TOC_STREAMING.headline}
        </div>
        <TocVarsityHeading as="h2" className="text-3xl md:text-4xl text-white mb-3">
          Watch from anywhere
        </TocVarsityHeading>
        {liveUrl ? (
          <>
            <p className="text-white/75 mb-6">The Tournament of Champions is streaming live.</p>
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-sm bg-[#CC0000] px-8 py-3.5 text-lg text-white hover:bg-[#a80000] transition-colors ${tocDisplayClass()}`}
            >
              Watch live
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </>
        ) : (
          <>
            <p className="text-white/85 text-lg leading-relaxed mb-2">{TOC_STREAMING.teaser}</p>
            <p className="text-white/60 text-sm mb-6">{TOC_STREAMING.notifyHint}</p>
            <a
              href="#email-signup"
              className={`inline-flex items-center justify-center rounded-sm border-2 border-white/30 px-6 py-3 text-base font-semibold text-white hover:border-white hover:bg-white/5 transition-colors ${tocDisplayClass()}`}
            >
              Get stream updates
            </a>
          </>
        )}
      </div>
    </section>
  )
}
