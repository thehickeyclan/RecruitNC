import Link from "next/link"
import { Trophy } from "lucide-react"
import { TOC_2026_AWARDS } from "@/lib/toc/constants"

/**
 * The first thing on the page now that the tournament is over.
 *
 * Everything below it still sells a tournament that has been wrestled — tickets, the schedule,
 * what to bring. Until that page is rebuilt around the result, this strip answers the question
 * the visitor actually arrived with: who won.
 */
export function TocResultsStrip() {
  return (
    <section className="border-b-4 border-[#D3B574] bg-[#0A1628] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-6 w-6 shrink-0 text-[#D3B574]" aria-hidden />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D3B574]">
              The 2026 tournament is complete
            </p>
            <p className="mt-1 text-lg font-extrabold leading-tight sm:text-xl">
              Ten champions crowned in Apex
            </p>
            <p className="mt-1 text-sm text-white/70">
              {TOC_2026_AWARDS.mostOutstandingWrestler.name} took Most Outstanding Wrestler
              {" · "}
              Match of Champions: {TOC_2026_AWARDS.matchOfChampions.label}
              {" · "}
              {TOC_2026_AWARDS.cadenPerryScholarship.name} received the Caden Perry Warrior Scholarship
            </p>
          </div>
        </div>
        <Link
          href="/tournament-of-champions/results"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#D3B574] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[#0A1628] transition hover:bg-[#c4a665]"
        >
          Results &amp; brackets
        </Link>
      </div>
    </section>
  )
}
