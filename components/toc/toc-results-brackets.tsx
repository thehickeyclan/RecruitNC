/**
 * Who placed in each weight, with a link to that weight's bracket.
 *
 * The bracket itself is drawn by the bracket component the seeding room already uses, in its
 * read-only mode — one bracket on the web, not a second one invented for this page.
 */

import Link from "next/link"
import type { WeightResults } from "@/lib/toc/public-results"

const PLACE_STYLE: Record<number, string> = {
  1: "bg-[#D3B574] text-[#0A1628]",
  2: "bg-[#C7CFD8] text-[#0A1628]",
  3: "bg-[#CC8E5A] text-[#0A1628]",
}

function placeLabel(place: number): string {
  if (place === 1) return "1st"
  if (place === 2) return "2nd"
  if (place === 3) return "3rd"
  return `${place}th`
}

export function TocResultsBrackets({ results }: { results: WeightResults[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {results.map((weight) => {
        const podium = weight.placers.filter((placer) => placer.place <= 3)
        return (
          <section
            key={weight.weightClass}
            id={`weight-${weight.weightClass}`}
            className="scroll-mt-24 rounded-xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h3 className="text-2xl font-extrabold text-white">{weight.weightClass} lbs</h3>
              <Link
                href={`/tournament-of-champions/results/${weight.weightClass}`}
                className="shrink-0 text-sm font-semibold text-[#D3B574] hover:underline"
              >
                Full bracket →
              </Link>
            </div>

            <ol className="space-y-2">
              {podium.map((placer) => (
                <li key={placer.place} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-10 shrink-0 items-center justify-center rounded text-xs font-bold ${
                      PLACE_STYLE[placer.place] ?? "bg-white/10 text-white/80"
                    }`}
                  >
                    {placeLabel(placer.place)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">
                    {placer.athleteId ? (
                      <Link href={`/view-profile?id=${placer.athleteId}`} className="hover:underline">
                        {placer.name}
                      </Link>
                    ) : (
                      placer.name
                    )}
                    {placer.club ? <span className="ml-2 text-xs font-normal text-white/40">{placer.club}</span> : null}
                  </span>
                  {placer.record ? (
                    <span className="shrink-0 font-mono text-xs text-white/60">{placer.record}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
