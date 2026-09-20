import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadTocResults } from "@/lib/toc/public-results"
import { TocResultsBrackets } from "@/components/toc/toc-results-brackets"
import {
  TOC_2026_AWARDS,
  TOC_2026_MADNESS,
  TOC_EVENT_DATES_RANGE,
  TOC_VENUE,
  TOC_WEIGHT_CLASSES,
} from "@/lib/toc/constants"

/**
 * What happened at the 2026 Tournament of Champions.
 *
 * Public and indexed, unlike the pre-event bracket pages: results are the thing people search for
 * after a tournament, and a wrestler's finish is his to show. The brackets here are read-only —
 * the admin view stays where it is, because it can still move a wrestler.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Results & Brackets | Tournament of Champions 2026",
  description:
    "Full results and brackets from the 2026 NC United Tournament of Champions in Apex — champions, placers and every bout in all ten weight classes.",
}

export default async function TocResultsPage() {
  const results = await loadTocResults(createAdminClient())
  const awards = TOC_2026_AWARDS
  const madness = TOC_2026_MADNESS

  return (
    <main className="min-h-screen bg-[#0A1628] pb-20 text-white">
      <header className="border-b border-white/10 bg-gradient-to-b from-[#13294B] to-[#0A1628] px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">
            {TOC_EVENT_DATES_RANGE} · {TOC_VENUE.city}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Results &amp; Brackets</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Ten champions crowned at the inaugural Tournament of Champions. Every bout below, as it was
            recorded at the mats.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                Most Outstanding Wrestler
              </p>
              <p className="mt-1 text-lg font-bold">
                <Link href={`/view-profile?id=${awards.mostOutstandingWrestler.athleteId}`} className="hover:underline">
                  {awards.mostOutstandingWrestler.name}
                </Link>
              </p>
              <p className="text-sm text-white/60">{awards.mostOutstandingWrestler.detail}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Match of Champions</p>
              <p className="mt-1 text-lg font-bold">{awards.matchOfChampions.label}</p>
              <p className="text-sm text-white/60">
                {awards.matchOfChampions.weightClass} lbs · {awards.matchOfChampions.result}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">
                Caden Perry Warrior Scholarship
              </p>
              <p className="mt-1 text-lg font-bold">
                <Link href={`/view-profile?id=${awards.cadenPerryScholarship.athleteId}`} className="hover:underline">
                  {awards.cadenPerryScholarship.name}
                </Link>
              </p>
              <p className="text-sm text-white/60">
                {awards.cadenPerryScholarship.highSchool} · {awards.cadenPerryScholarship.award}
              </p>
            </div>
          </div>

          {/* Ten weights is a long page; the jump links are how a parent finds their kid's bracket. */}
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Jump to a weight class">
            {TOC_WEIGHT_CLASSES.map((weight) => (
              <a
                key={weight}
                href={`#weight-${weight}`}
                className="rounded-full border border-white/15 px-3 py-1 text-sm font-semibold text-white/80 hover:border-[#D3B574] hover:text-white"
              >
                {weight}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/*
        The pool, decided by one point.

        Above the brackets rather than below them: it is the one thing on this page that nobody who
        watched the weekend already knows, and a page that opens with ten brackets buries it.
      */}
      <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 rounded-xl border border-[#D3B574]/40 bg-[#D3B574]/[0.06] p-5 sm:p-6 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D3B574]">TOC Madness</p>
            <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {madness.winner} <span className="text-white/40">({madness.leaderboardName})</span>
            </h2>
            <p className="mt-2 text-white/70">
              {madness.points} points and {madness.correct} correct picks across all {madness.weightsEntered}{" "}
              weights — {madness.margin === 1 ? "one point" : `${madness.margin} points`} clear of second, out of{" "}
              {madness.entrants} entrants.
            </p>
            <p className="mt-4 text-sm text-white/60">
              <span className="font-semibold text-white/80">The prize:</span> {madness.prize.label} ·{" "}
              {madness.prize.detail}
            </p>
          </div>
          <div className="shrink-0 self-center rounded-lg bg-white p-3">
            <Image
              src={madness.prize.src}
              alt={madness.prize.alt}
              width={madness.prize.width}
              height={madness.prize.height}
              className="h-auto w-44 sm:w-52"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {results.length === 0 ? (
          <p className="text-white/60">Results are not posted yet.</p>
        ) : (
          <TocResultsBrackets results={results} />
        )}
      </div>
    </main>
  )
}
