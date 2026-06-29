"use client"

import { ChevronDown, Sparkles } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { AauScholasticQualityWinsSummary, AauScholasticWrestlerQualityWins } from "@/lib/aau-scholastic-duals-2026-quality-wins"
import { cn } from "@/lib/utils"

function QualityWinTable({ entry }: { entry: AauScholasticWrestlerQualityWins }) {
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-white/10 -mx-1 sm:mx-0">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-[#0a2040]/80 text-left text-white/90">
              <th className="px-3 sm:px-4 py-2.5 font-bold">Opponent</th>
              <th className="px-3 sm:px-4 py-2.5 font-bold w-24">State</th>
              <th className="px-3 sm:px-4 py-2.5 font-bold">Credentials</th>
              <th className="px-3 sm:px-4 py-2.5 font-bold w-28 sm:w-36">Result</th>
            </tr>
          </thead>
          <tbody>
            {entry.wins.map((win) => (
              <tr key={win.opponentName} className="border-t border-white/10 hover:bg-white/[0.03]">
                <td className="px-3 sm:px-4 py-3 font-semibold text-white">{win.opponentName}</td>
                <td className="px-3 sm:px-4 py-3 text-white/75">{win.state}</td>
                <td className="px-3 sm:px-4 py-3 text-white/80">{win.credentials}</td>
                <td className="px-3 sm:px-4 py-3 text-white/60 text-xs">
                  {win.resultLine ? (
                    <span className="block">
                      <span className="font-bold text-[#FF7070] tabular-nums">{win.resultLine}</span>
                      {win.opponentTeam ? (
                        <span className="block mt-0.5 truncate max-w-[140px] sm:max-w-[160px]">{win.opponentTeam}</span>
                      ) : null}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-[#B31B1B]/25 bg-[#0a2040]/50 px-4 py-4">
        <Collapsible className="group">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-[#FF7070]">
              {entry.wrestler} · Quality win recap
            </p>
            <ChevronDown className="h-4 w-4 text-white/50 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-white/85 mt-3">
              {entry.summaryBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7070]" aria-hidden />
                  {bullet}
                </li>
              ))}
            </ul>
            <p className="text-sm text-white/70 mt-4 leading-relaxed italic">{entry.summaryNote}</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}

/** Quality-win detail — embed inside an individual results row. */
export function AauScholasticQualityWinsDetail({ entry }: { entry: AauScholasticWrestlerQualityWins }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#FF7070] flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Quality wins · {entry.wins.length} signature win{entry.wins.length === 1 ? "" : "s"}
      </p>
      <QualityWinTable entry={entry} />
    </div>
  )
}

export function AauScholasticQualityWinsTeamRollup({
  summary,
  compact = false,
  variant = "default",
  className,
}: {
  summary: AauScholasticQualityWinsSummary
  compact?: boolean
  variant?: "default" | "hero"
  className?: string
}) {
  const tiles = [
    { label: "Quality wins", value: summary.totalWins },
    { label: "Vs state champions", value: summary.vsStateChampions },
    { label: "Vs state placers", value: summary.vsStatePlacers },
    { label: "Vs state qualifiers", value: summary.vsStateQualifiers },
  ]

  const tileClass =
    variant === "hero"
      ? "rounded-xl border border-white/15 bg-white/10 text-center"
      : "rounded-xl border border-[#B31B1B]/25 bg-[#0a2040]/50 text-center"

  return (
    <div className={className}>
      {!compact ? (
        <p className="text-xs sm:text-sm text-white/60 mb-4">
          Quality wins over state champions, placers, and qualifiers across {summary.wrestlerCount} wrestlers.
        </p>
      ) : null}
      <div className={cn("grid grid-cols-2 gap-3", compact ? "sm:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4")}>
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(tileClass, compact ? "px-3 py-3 sm:p-4" : "px-3 py-4")}
          >
            <div className={cn("font-black text-[#D3B574] tabular-nums", compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl")}>
              {tile.value}
            </div>
            <div className={cn("text-white/70 mt-1", compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm")}>
              {tile.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
