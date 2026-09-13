import Image from "next/image"
import { ArrowRight } from "lucide-react"

import { TOC_FLO_URL } from "@/lib/toc/constants"

/**
 * FloWrestling broadcast notice, directly under the hero.
 *
 * Near the top rather than only in the streaming section far down the page: most visitors are
 * families and fans who cannot get a seat, and "can I watch it?" is the first thing they ask.
 */
export function TocFloStreamingStrip() {
  return (
    <section className="border-b border-[#C8A94A]/25 bg-[#0A1628] text-white" aria-label="Live stream on FloWrestling">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <a
          href={TOC_FLO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-4 py-3.5 sm:py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/images/flo-logo.png"
              alt="FloWrestling"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-md"
            />
            <p className="min-w-0 text-sm leading-snug text-white/70 sm:text-base">
              <strong className="text-white">Streaming live on FloWrestling.</strong>{" "}
              <span>Every match, live and on demand, with commentary from Ryan Mitchell of The NC Mat.</span>
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#C8A94A] transition-colors group-hover:text-white">
            <span className="hidden sm:inline">Watch on Flo</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </a>
      </div>
    </section>
  )
}
