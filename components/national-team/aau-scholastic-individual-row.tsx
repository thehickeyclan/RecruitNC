"use client"

import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { HardLink } from "@/components/hard-link"
import type { AauIndividualBoutLog } from "@/lib/aau-scholastic-duals-2026-dual-bouts"
import type { AauScholasticIndividualResult } from "@/lib/aau-scholastic-duals-2026-results"
import {
  matchQualityWinToBout,
  type AauScholasticQualityWin,
  type AauScholasticWrestlerQualityWins,
} from "@/lib/aau-scholastic-duals-2026-quality-wins"
import { cn } from "@/lib/utils"

function IndividualBoutRow({
  bout,
  qualityWin,
}: {
  bout: AauIndividualBoutLog
  qualityWin?: AauScholasticQualityWin | null
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2.5 sm:p-3",
        qualityWin
          ? "border-[#D3B574]/35 bg-[#D3B574]/10"
          : bout.won
            ? "border-emerald-400/30 bg-emerald-500/10"
            : "border-red-400/30 bg-red-500/10",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
              Dual #{bout.matchNumber}
              {bout.dualNotes ? ` · ${bout.dualNotes}` : ""} · vs {bout.opponentTeam}
            </p>
            {qualityWin ? (
              <Badge className="bg-[#B31B1B]/90 text-white border-0 text-[10px] px-1.5 py-0 h-5">
                Quality win
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-white">
            {bout.weightLbs} lbs · {qualityWin?.opponentName ?? bout.opponentWrestler}
          </p>
          {qualityWin ? (
            <p className="text-xs text-[#D3B574]/90 mt-0.5">
              {qualityWin.state} · {qualityWin.credentials}
            </p>
          ) : null}
          <p className="text-xs text-white/70 mt-0.5">{bout.resultLine}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-black tabular-nums text-white">
            {bout.ourTeamPts}–{bout.opponentTeamPts}
          </span>
          <Badge className={bout.won ? "bg-emerald-600" : "bg-red-700"}>{bout.won ? "W" : "L"}</Badge>
        </div>
      </div>
    </div>
  )
}

function QualityWinRecap({ entry }: { entry: AauScholasticWrestlerQualityWins }) {
  return (
    <Collapsible className="group rounded-lg border border-white/10 bg-[#0a2040]/40">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="text-xs font-semibold text-white/70">Quality win summary</span>
        <ChevronDown className="h-4 w-4 text-white/50 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-white/10 px-3 py-3">
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-white/85">
            {entry.summaryBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7070]" aria-hidden />
                {bullet}
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/65 mt-3 leading-relaxed italic">{entry.summaryNote}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AauScholasticIndividualRow({
  result,
  bouts,
  profileHref,
  school,
  qualityWins,
}: {
  result: AauScholasticIndividualResult
  bouts: AauIndividualBoutLog[]
  profileHref: string
  school: string
  qualityWins?: AauScholasticWrestlerQualityWins | null
}) {
  const winPct = result.wins + result.losses > 0 ? Math.round((result.wins / (result.wins + result.losses)) * 100) : null
  const hasBouts = bouts.length > 0
  const hasQualityWins = Boolean(qualityWins?.wins.length)
  const isExpandable = hasBouts
  const recordWin = result.losses === 0 && result.wins > 0
  const qualitySummaryLine = hasQualityWins ? qualityWins!.summaryBullets[0] : null

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-1 min-w-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-bold text-white/55 tabular-nums">{result.weightLabel}</span>
          <span onClick={(e) => e.stopPropagation()} className="inline">
            <HardLink href={profileHref} className="font-bold text-white hover:text-[#FF7070] hover:underline">
              {result.wrestler}
            </HardLink>
          </span>
          {hasQualityWins ? (
            <Badge variant="outline" className="border-[#D3B574]/40 text-[#D3B574] text-xs tabular-nums">
              {qualityWins!.wins.length} quality win{qualityWins!.wins.length === 1 ? "" : "s"}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-white/65 truncate">{school}</p>
        {qualitySummaryLine ? (
          <p className="text-xs text-white/50 mt-1 line-clamp-2">{qualitySummaryLine}</p>
        ) : result.notes ? (
          <p className="text-xs text-white/45 mt-1 line-clamp-2">{result.notes}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <div className="text-right">
          <span className={cn("font-black text-lg tabular-nums", recordWin ? "text-emerald-300" : "text-white")}>
            {result.wins}-{result.losses}
          </span>
          {winPct != null ? <span className="block text-[10px] text-white/50">{winPct}%</span> : null}
        </div>
        <div className="text-right hidden sm:block">
          <span
            className={cn(
              "font-bold tabular-nums text-sm",
              result.netPts > 0 ? "text-emerald-300" : result.netPts < 0 ? "text-red-300" : "text-white/70",
            )}
          >
            {result.netPts > 0 ? `+${result.netPts}` : result.netPts} net
          </span>
          <span className="block text-[10px] text-white/45 tabular-nums">
            {result.grossPts}-{result.allowedPts} · {result.bonusWins} bonus
          </span>
        </div>
        {isExpandable ? (
          <ChevronDown className="h-4 w-4 text-white/50 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        ) : null}
      </div>
    </div>
  )

  if (!isExpandable) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0a2040]/40 px-4 py-3">{header}</div>
    )
  }

  return (
    <Collapsible className="group rounded-xl border border-white/10 overflow-hidden bg-[#0a2040]/40 data-[state=open]:ring-1 data-[state=open]:ring-white/10">
      <CollapsibleTrigger className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors">
        {header}
        <p className="text-xs text-white/45 mt-2 sm:mt-1">
          Tap for {bouts.length} match{bouts.length === 1 ? "" : "es"}
          {hasQualityWins ? " · quality wins flagged" : ""}
        </p>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3 border-t border-white/10 pt-3">
          {bouts.map((bout) => (
            <IndividualBoutRow
              key={`${bout.matchNumber}-${bout.weightLbs}-${bout.resultLine}-${bout.opponentWrestler}`}
              bout={bout}
              qualityWin={qualityWins ? matchQualityWinToBout(bout, qualityWins) : null}
            />
          ))}
          {qualityWins ? <QualityWinRecap entry={qualityWins} /> : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
