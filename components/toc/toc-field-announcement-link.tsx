import { ArrowRight } from "lucide-react"

import { HardLink } from "@/components/hard-link"

/** Compact launch notice for the public, weight-by-weight athlete announcement page. */
export function TocFieldAnnouncementLink() {
  return (
    <section className="border-y border-[#C8A94A]/25 bg-[#061224] text-white" aria-label="Athlete announcements">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <HardLink
          href="/tournament-of-champions/field"
          className="group flex items-center justify-between gap-4 py-3.5 sm:py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-full bg-[#CC0000] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Live
            </span>
            <p className="min-w-0 text-sm leading-snug text-white/70 sm:text-base">
              <strong className="text-white">Athlete announcements have started.</strong>{" "}
              <span className="whitespace-nowrap">The 117 lb field is now live.</span>
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-[#C8A94A] transition-colors group-hover:text-white">
            <span className="hidden sm:inline">View the field</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </HardLink>
      </div>
    </section>
  )
}
