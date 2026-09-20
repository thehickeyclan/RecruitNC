/**
 * Every weight's podium and full bracket, for the public results page.
 *
 * Read-only on purpose. The admin bracket view is a seeding and simulation tool — it lets a
 * wrestler be dragged and a result be undone, which is right for the week before the tournament
 * and wrong for a finished one. This draws what happened: who won each bout, how, and who placed.
 */

import Link from "next/link"
import type { ResultBout, WeightResults } from "@/lib/toc/public-results"

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

function WrestlerLine({ wrestler }: { wrestler: ResultBout["top"] }) {
  if (!wrestler) {
    return <div className="flex items-center gap-2 px-3 py-2 text-sm text-white/30">Bye</div>
  }
  const name = wrestler.athleteId ? (
    <Link href={`/view-profile?id=${wrestler.athleteId}`} className="truncate hover:underline">
      {wrestler.name}
    </Link>
  ) : (
    <span className="truncate">{wrestler.name}</span>
  )
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-sm ${
        wrestler.won ? "bg-[#D3B574]/15 font-semibold text-white" : "text-white/70"
      }`}
    >
      <span className="w-5 shrink-0 text-center text-[11px] font-bold text-white/40">{wrestler.seed ?? "–"}</span>
      {name}
    </div>
  )
}

function BoutCard({ bout }: { bout: ResultBout }) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
          Bout {bout.boutNumber}
        </span>
        {bout.outcome ? (
          <span className="text-[10px] font-bold tracking-wide text-[#D3B574]">{bout.outcome}</span>
        ) : null}
      </div>
      <WrestlerLine wrestler={bout.top} />
      <div className="h-px bg-white/10" />
      <WrestlerLine wrestler={bout.bottom} />
    </div>
  )
}

/** Bouts grouped in the order they were wrestled, so a column reads as a round. */
function rounds(bouts: ResultBout[]): Array<{ label: string; bouts: ResultBout[] }> {
  const order: string[] = []
  const grouped = new Map<string, ResultBout[]>()
  for (const bout of bouts) {
    if (!grouped.has(bout.roundLabel)) {
      grouped.set(bout.roundLabel, [])
      order.push(bout.roundLabel)
    }
    grouped.get(bout.roundLabel)!.push(bout)
  }
  return order.map((label) => ({ label, bouts: grouped.get(label)! }))
}

export function TocResultsBrackets({ results }: { results: WeightResults[] }) {
  return (
    <div className="space-y-12">
      {results.map((weight) => (
        <section key={weight.weightClass} id={`weight-${weight.weightClass}`} className="scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-extrabold text-white">{weight.weightClass} lbs</h3>
            {/* The podium sits above the bracket: it is what most people came to read. */}
            <div className="flex flex-wrap gap-2">
              {weight.placers.map((placer) => (
                <span
                  key={placer.place}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                    PLACE_STYLE[placer.place] ?? "bg-white/10 text-white/80"
                  }`}
                >
                  <span className="opacity-70">{placeLabel(placer.place)}</span>
                  {placer.athleteId ? (
                    <Link href={`/view-profile?id=${placer.athleteId}`} className="hover:underline">
                      {placer.name}
                    </Link>
                  ) : (
                    placer.name
                  )}
                  {placer.record ? <span className="font-mono font-normal opacity-70">{placer.record}</span> : null}
                </span>
              ))}
            </div>
          </div>

          {/* One column per round. Scrolls sideways on a phone rather than shrinking names away. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex min-w-max gap-4">
              {rounds(weight.bouts).map((round) => (
                <div key={round.label} className="w-[248px] shrink-0 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{round.label}</p>
                  {round.bouts.map((bout) => (
                    <BoutCard key={bout.boutNumber} bout={bout} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
