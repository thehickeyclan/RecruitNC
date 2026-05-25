"use client"

import { ChevronDown } from "lucide-react"
import type { DualFeedItem } from "@/lib/nhsca-duals-command-center"
import { buildDualBoutRows } from "@/lib/nhsca-duals-dual-detail"
import type { NhscaDualsDualRow, NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

export function NhscaDualBoutList({
  snapshot,
  dual,
}: {
  snapshot: NhscaDualsResultsSnapshot
  dual: NhscaDualsDualRow
}) {
  const bouts = buildDualBoutRows(snapshot, dual)
  return (
    <>
      {bouts.map((bout) => (
        <DualBoutCard key={bout.weight} bout={bout} />
      ))}
    </>
  )
}

function DualBoutCard({ bout }: { bout: ReturnType<typeof buildDualBoutRows>[number] }) {
  if (!bout.hasResult) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#002147]/50 px-3 py-2.5 flex items-center gap-3 opacity-70">
        <span className="text-[11px] font-bold text-white/55 bg-white/10 rounded-md px-2 py-1 shrink-0">
          {bout.weight}
        </span>
        <span className="text-xs text-white/40">Not wrestled yet</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#002147]/55 shadow-sm overflow-hidden">
      <div className="flex items-start gap-2 px-2.5 pt-2.5 pb-2">
        <span className="text-[11px] font-bold text-white/70 bg-white/10 rounded-md px-2 py-1 shrink-0 mt-5">
          {bout.weight}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-center text-[11px] font-bold text-white/90 tracking-tight mb-1.5">
            {bout.resultDisplay}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
            <div
              className={cn(
                "rounded-lg border-2 px-2 py-1.5 min-h-[52px] flex flex-col justify-center",
                bout.ncWon ? "border-[#B31B1B] bg-[#B31B1B]/15" : "border-white/15 bg-white/5"
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold leading-tight truncate",
                  bout.ncWon ? "text-[#CBAF5D]" : "text-white/45"
                )}
              >
                {bout.ncNameShort}
              </p>
              <p
                className={cn(
                  "text-lg font-black tabular-nums leading-none mt-0.5",
                  bout.ncPoints > 0 ? "text-[#CBAF5D]" : "text-white/20"
                )}
              >
                {bout.ncPoints}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center px-0.5 shrink-0" aria-hidden>
              <span
                className={cn(
                  "text-[10px] font-bold text-white/25",
                  bout.ncWon && "text-[#CBAF5D]",
                  bout.opponentWon && "text-emerald-400"
                )}
              >
                {bout.opponentWon ? "▶" : "◀"}
              </span>
            </div>

            <div
              className={cn(
                "rounded-lg border-2 px-2 py-1.5 min-h-[52px] flex flex-col justify-center items-end text-right",
                bout.opponentWon ? "border-emerald-500/50 bg-emerald-950/35" : "border-white/15 bg-white/5"
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold leading-tight truncate max-w-full",
                  bout.opponentWon ? "text-emerald-300" : "text-white/45"
                )}
              >
                {bout.opponentNameShort || "\u00a0"}
              </p>
              <p
                className={cn(
                  "text-lg font-black tabular-nums leading-none mt-0.5",
                  bout.opponentPoints > 0 ? "text-emerald-400" : "text-white/20"
                )}
              >
                {bout.opponentPoints}
              </p>
            </div>
          </div>
        </div>
      </div>

      {bout.noteTags ? (
        <p className="px-3 pb-2 text-[10px] text-amber-400/90 border-t border-white/10 pt-1.5">{bout.noteTags}</p>
      ) : null}
    </div>
  )
}

/** Expandable dual row — tap to show/hide bout list inline (no full-screen overlay). */
export function NhscaDualSummaryCard({
  item,
  snapshot,
  expanded = false,
  onToggle,
}: {
  item: DualFeedItem
  snapshot: NhscaDualsResultsSnapshot
  expanded?: boolean
  onToggle: () => void
}) {
  const { dual, teamName, dayName, poolNumber } = item
  const ncWin = dual.nc_score > dual.opponent_score
  const ncLoss = dual.opponent_score > dual.nc_score
  const isLive = dual.status === "in_progress"
  const bouts = expanded ? buildDualBoutRows(snapshot, dual) : []
  const entered = bouts.filter((b) => b.hasResult).length

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        isLive ? "border-green-500/40 bg-green-950/20" : "border-white/10 bg-[#002147]/45"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-3 py-3 min-h-[56px] active:bg-white/5 transition-colors hover:border-[#CBAF5D]/35"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {isLive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              ) : dual.status === "final" ? (
                <span className="text-[9px] font-bold uppercase text-white/40">Final</span>
              ) : (
                <span className="text-[9px] font-bold uppercase text-white/40">Upcoming</span>
              )}
              <p className="text-[10px] text-white/40">
                {dayName}
                {poolNumber != null ? ` · P${poolNumber}` : ""}
              </p>
            </div>
            <p className="text-sm font-bold text-white mt-0.5 leading-snug">vs {dual.opponent_team_name}</p>
            {dual.round_name ? (
              <p className="text-[10px] text-white/45 mt-0.5">{dual.round_name}</p>
            ) : (
              <p className="text-[10px] text-white/45 mt-0.5">{teamName}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-black tabular-nums leading-none">
              <span className="text-[#CBAF5D]">{dual.nc_score}</span>
              <span className="text-white/30 mx-0.5">–</span>
              <span className="text-white">{dual.opponent_score}</span>
            </p>
            <span
              className={cn(
                "inline-block mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                ncWin && "bg-emerald-600/25 text-emerald-300",
                ncLoss && "bg-red-600/20 text-red-300",
                !ncWin && !ncLoss && "bg-white/10 text-white/50"
              )}
            >
              {ncWin ? "Win" : ncLoss ? "Loss" : "Tie"}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-[#CBAF5D]/80 mt-2 flex items-center gap-0.5">
          {expanded ? "Hide bouts" : "View all bouts"}
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
        </p>
      </button>

      {expanded ? (
        <div className="border-t border-white/10 bg-[#001428]/90 px-2 py-2 space-y-2 max-h-[min(70vh,520px)] overflow-y-auto">
          <p className="text-[10px] text-white/45 px-1 pt-0.5">
            {entered} of {bouts.length} bouts
          </p>
          <NhscaDualBoutList snapshot={snapshot} dual={dual} />
        </div>
      ) : null}
    </div>
  )
}
