"use client"

import { ChevronDown, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { HardLink } from "@/components/hard-link"
import { aauScholasticProfileHref } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"
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
        <p className="text-xs font-bold uppercase tracking-wider text-[#FF7070] mb-3">
          {entry.wrestler} · Quality win summary
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 text-sm text-white/85">
          {entry.summaryBullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7070]" aria-hidden />
              {bullet}
            </li>
          ))}
        </ul>
        <p className="text-sm text-white/70 mt-4 leading-relaxed italic">{entry.summaryNote}</p>
      </div>
    </>
  )
}

function QualityWinBlock({
  entry,
  profileIdMap,
}: {
  entry: AauScholasticWrestlerQualityWins
  profileIdMap: Record<string, string>
}) {
  const profileHref = aauScholasticProfileHref(entry.wrestler, profileIdMap)
  const winCount = entry.wins.length

  return (
    <Collapsible className="group rounded-xl border border-white/10 overflow-hidden bg-[#0a2040]/30 data-[state=open]:ring-1 data-[state=open]:ring-white/10">
      <CollapsibleTrigger className="w-full px-4 py-3.5 sm:py-4 text-left hover:bg-white/5 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span onClick={(e) => e.stopPropagation()} className="inline">
                <HardLink
                  href={profileHref}
                  className="text-base sm:text-lg font-black text-white hover:text-[#FF7070] hover:underline"
                >
                  {entry.wrestler}
                </HardLink>
              </span>
              <Badge className="bg-[#B31B1B]/80 text-white border-0 tabular-nums text-xs">{entry.record}</Badge>
              <Badge variant="outline" className="border-[#D3B574]/40 text-[#D3B574] text-xs tabular-nums">
                {winCount} quality win{winCount === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-[#D3B574] tabular-nums">{entry.weightLabel}</p>
          </div>
          <ChevronDown className="h-5 w-5 text-white/50 shrink-0 mt-1 transition-transform group-data-[state=open]:rotate-180" />
        </div>
        <p className="text-xs text-white/45 mt-2">Tap to expand signature wins &amp; bout results</p>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 sm:pb-5 space-y-5 border-t border-white/10 pt-4">
          <QualityWinTable entry={entry} />
        </div>
      </CollapsibleContent>
    </Collapsible>
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
    { label: "Curated quality wins", value: summary.totalWins },
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
          Signature wins over state champions, placers, and qualifiers across {summary.wrestlerCount} wrestlers — curated
          highlights, not every bout in the tournament.
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

/** Featured quality-win block — embed inside Individual results panel. */
export function AauScholasticQualityWinsFeatured({
  entries,
  summary,
  profileIdMap = {},
}: {
  entries: AauScholasticWrestlerQualityWins[]
  summary: AauScholasticQualityWinsSummary
  profileIdMap?: Record<string, string>
}) {
  if (entries.length === 0) return null

  return (
    <div id="quality-wins" className="scroll-mt-28 space-y-5 pb-8 border-b border-white/10">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FF7070] shrink-0" aria-hidden />
          <h3 className="text-base font-bold text-white">Quality wins</h3>
        </div>
        <p className="text-sm text-white/65">
          Team rollup:{" "}
          <span className="font-semibold text-white tabular-nums">{summary.totalWins}</span> signature wins ·{" "}
          <span className="font-semibold text-white tabular-nums">{summary.vsStateChampions}</span> vs state champs ·{" "}
          <span className="font-semibold text-white tabular-nums">{summary.vsStatePlacers}</span> vs placers ·{" "}
          <span className="font-semibold text-white tabular-nums">{summary.vsStateQualifiers}</span> vs qualifiers
        </p>
        <AauScholasticQualityWinsTeamRollup summary={summary} compact />
      </div>
      <p className="text-xs text-white/45">Tap a wrestler to expand their full quality-win table (106 → HWT).</p>
      <div className="space-y-3">
        {entries.map((entry) => (
          <QualityWinBlock key={entry.wrestler} entry={entry} profileIdMap={profileIdMap} />
        ))}
      </div>
    </div>
  )
}
