"use client"

import { ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { AauScholasticDualResult } from "@/lib/aau-scholastic-duals-2026-results"
import type { AauScholasticDualBout } from "@/lib/aau-scholastic-duals-2026-dual-bouts"
import { cn } from "@/lib/utils"

function BoutSide({
  label,
  wrestler,
  teamPts,
  won,
  tone,
}: {
  label: string
  wrestler: string
  teamPts: number
  won: boolean
  tone: "opponent" | "nc"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 min-w-0",
        won && tone === "nc" && "border-emerald-400/70 bg-emerald-500/10",
        won && tone === "opponent" && "border-red-400/70 bg-red-500/10",
        !won && "border-white/10 bg-black/20"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45 truncate">{label}</p>
      <p className="text-sm font-semibold text-white truncate">{wrestler || "—"}</p>
      <p className={cn("text-lg font-black tabular-nums", won ? "text-white" : "text-white/45")}>{teamPts}</p>
    </div>
  )
}

function BoutRow({ bout, opponent }: { bout: AauScholasticDualBout; opponent: string }) {
  const ncWin = bout.ourTeamPts > bout.opponentTeamPts
  const opponentWin = bout.opponentTeamPts > bout.ourTeamPts

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a2040]/40 p-2.5 sm:p-3">
      <p className="text-center text-[11px] font-bold text-white/70 mb-2">{bout.resultLine}</p>
      <div className="grid grid-cols-[2.75rem_1fr_1fr] gap-2 items-stretch">
        <div className="flex items-center justify-center rounded-md bg-white/10 px-1">
          <span className="text-xs font-bold text-white tabular-nums">{bout.weightLbs}</span>
        </div>
        <BoutSide
          label={opponent}
          wrestler={bout.opponentWrestler}
          teamPts={bout.opponentTeamPts}
          won={opponentWin}
          tone="opponent"
        />
        <BoutSide label="NC United" wrestler={bout.ourWrestler} teamPts={bout.ourTeamPts} won={ncWin} tone="nc" />
      </div>
    </div>
  )
}

export function AauScholasticDualMeetRow({
  dual,
  bouts,
}: {
  dual: AauScholasticDualResult
  bouts: AauScholasticDualBout[]
}) {
  const win = dual.result === "W"
  const hasBouts = bouts.length > 0

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 flex-1 min-w-0">
      <div className="min-w-0">
        <p className="font-bold text-white">
          {dual.matchNumber != null ? `#${dual.matchNumber} · ` : ""}vs {dual.opponent}
        </p>
        {dual.notes && <p className="text-sm text-white/65 mt-0.5">{dual.notes}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={cn("font-black text-lg tabular-nums", win ? "text-emerald-300" : "text-red-300")}>
          {dual.ourScore}–{dual.opponentScore}
        </span>
        <Badge className={win ? "bg-emerald-600" : "bg-red-700"}>{win ? "W" : "L"}</Badge>
        {hasBouts ? (
          <ChevronDown className="h-4 w-4 text-white/50 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        ) : null}
      </div>
    </div>
  )

  if (!hasBouts) {
    return (
      <div
        className={cn(
          "rounded-xl border-l-4 px-4 py-3",
          win ? "bg-emerald-500/10 border-emerald-500" : "bg-red-500/10 border-red-500"
        )}
      >
        {header}
      </div>
    )
  }

  return (
    <Collapsible className="group rounded-xl border-l-4 overflow-hidden data-[state=open]:ring-1 data-[state=open]:ring-white/10">
      <div className={cn(win ? "bg-emerald-500/10 border-emerald-500" : "bg-red-500/10 border-red-500", "border-l-4")}>
        <CollapsibleTrigger className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors">
          {header}
          <p className="text-xs text-white/45 mt-2 sm:mt-1">Tap to expand {bouts.length} bout results</p>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2 border-t border-white/10 pt-3">
            {bouts.map((bout) => (
              <BoutRow key={`${bout.weightLbs}-${bout.resultLine}`} bout={bout} opponent={dual.opponent} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
