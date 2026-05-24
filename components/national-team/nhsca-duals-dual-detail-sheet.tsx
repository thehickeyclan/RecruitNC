"use client"

import { useEffect } from "react"
import { ChevronRight, X } from "lucide-react"
import type { DualFeedItem } from "@/lib/nhsca-duals-command-center"
import { buildDualBoutRows } from "@/lib/nhsca-duals-dual-detail"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { cn } from "@/lib/utils"

export function NhscaDualsDualDetailSheet({
  item,
  snapshot,
  onClose,
}: {
  item: DualFeedItem
  snapshot: NhscaDualsResultsSnapshot
  onClose: () => void
}) {
  const { dual, teamName, dayName, poolNumber } = item
  const bouts = buildDualBoutRows(snapshot, dual)
  const ncWin = dual.nc_score > dual.opponent_score
  const ncLoss = dual.opponent_score > dual.nc_score
  const entered = bouts.filter((b) => b.hasResult).length
  const isLive = dual.status === "in_progress"
  const ncShort = teamName.replace(/^NC United\s+/i, "NC United") || "NC United"
  const oppShort = dual.opponent_team_name

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#eef1f5]"
      role="dialog"
      aria-modal="true"
      aria-label="Dual results"
    >
      <header className="shrink-0 bg-white border-b border-black/8 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              {isLive ? (
                <span className="inline-flex items-center gap-1 text-green-600 mr-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                  Live
                </span>
              ) : dual.status === "final" ? (
                <span className="text-neutral-400 mr-2">Final</span>
              ) : null}
              {dayName}
              {poolNumber != null ? ` · Pool ${poolNumber}` : ""}
              {dual.round_name ? ` · ${dual.round_name}` : ""}
            </p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{entered} of {bouts.length} bouts</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-h-[44px] min-w-[44px] rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center min-w-0">
            <p className="text-[11px] font-bold uppercase text-[#B31B1B] truncate px-1">{ncShort}</p>
            <div
              className={cn(
                "mt-1 rounded-lg border-2 px-2 py-2",
                ncWin ? "border-[#B31B1B] bg-[#B31B1B]/5" : "border-neutral-200 bg-neutral-50"
              )}
            >
              {ncWin ? (
                <p className="text-[10px] font-bold uppercase text-[#B31B1B] mb-0.5">Winner</p>
              ) : null}
              <p className="text-3xl font-black tabular-nums text-[#B31B1B] leading-none">{dual.nc_score}</p>
            </div>
          </div>
          <div className="text-center min-w-0">
            <p className="text-[11px] font-bold uppercase text-emerald-700 truncate px-1 leading-tight line-clamp-2">
              {oppShort}
            </p>
            <div
              className={cn(
                "mt-1 rounded-lg border-2 px-2 py-2",
                ncLoss ? "border-emerald-600 bg-emerald-50" : "border-neutral-200 bg-neutral-50"
              )}
            >
              {ncLoss ? (
                <p className="text-[10px] font-bold uppercase text-emerald-700 mb-0.5">Winner</p>
              ) : null}
              <p className="text-3xl font-black tabular-nums text-emerald-800 leading-none">{dual.opponent_score}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        {bouts.map((bout) => (
          <DualBoutCard key={bout.weight} bout={bout} />
        ))}
      </div>
    </div>
  )
}

function DualBoutCard({ bout }: { bout: ReturnType<typeof buildDualBoutRows>[number] }) {
  if (!bout.hasResult) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2.5 flex items-center gap-3 opacity-60">
        <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 rounded-md px-2 py-1 shrink-0">
          {bout.weight}
        </span>
        <span className="text-xs text-neutral-400">Not wrestled yet</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-2 px-2.5 pt-2.5 pb-2">
        <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 rounded-md px-2 py-1 shrink-0 mt-5">
          {bout.weight}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-center text-[11px] font-bold text-neutral-800 tracking-tight mb-1.5">
            {bout.resultDisplay}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
            <div
              className={cn(
                "rounded-lg border-2 px-2 py-1.5 min-h-[52px] flex flex-col justify-center",
                bout.ncWon ? "border-[#B31B1B] bg-[#B31B1B]/5" : "border-neutral-200 bg-neutral-50"
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold leading-tight truncate",
                  bout.ncWon ? "text-[#B31B1B]" : "text-neutral-500"
                )}
              >
                {bout.ncNameShort}
              </p>
              <p
                className={cn(
                  "text-lg font-black tabular-nums leading-none mt-0.5",
                  bout.ncPoints > 0 ? "text-[#B31B1B]" : "text-neutral-300"
                )}
              >
                {bout.ncPoints}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center px-0.5 shrink-0" aria-hidden>
              <span
                className={cn(
                  "text-[10px] font-bold text-neutral-300",
                  bout.ncWon && "text-[#B31B1B]",
                  bout.opponentWon && "text-emerald-600"
                )}
              >
                {bout.opponentWon ? "▶" : "◀"}
              </span>
            </div>

            <div
              className={cn(
                "rounded-lg border-2 px-2 py-1.5 min-h-[52px] flex flex-col justify-center items-end text-right",
                bout.opponentWon ? "border-emerald-600 bg-emerald-50" : "border-neutral-200 bg-neutral-50"
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold leading-tight truncate max-w-full",
                  bout.opponentWon ? "text-emerald-800" : "text-neutral-500"
                )}
              >
                {bout.opponentNameShort || "\u00a0"}
              </p>
              <p
                className={cn(
                  "text-lg font-black tabular-nums leading-none mt-0.5",
                  bout.opponentPoints > 0 ? "text-emerald-700" : "text-neutral-300"
                )}
              >
                {bout.opponentPoints}
              </p>
            </div>
          </div>
        </div>
      </div>

      {bout.noteTags ? (
        <p className="px-3 pb-2 text-[10px] text-amber-700/90 border-t border-neutral-100 pt-1.5">{bout.noteTags}</p>
      ) : null}
    </div>
  )
}

/** Compact tappable row for dual list on dashboard. */
export function NhscaDualSummaryCard({
  item,
  onClick,
}: {
  item: DualFeedItem
  onClick: () => void
}) {
  const { dual, teamName, dayName, poolNumber } = item
  const ncWin = dual.nc_score > dual.opponent_score
  const ncLoss = dual.opponent_score > dual.nc_score
  const isLive = dual.status === "in_progress"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border px-3 py-3 min-h-[56px] active:bg-white/5 transition-colors",
        isLive ? "border-green-500/40 bg-green-950/20" : "border-white/10 bg-[#002147]/45 hover:border-[#CBAF5D]/35"
      )}
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
          <p className="text-sm font-bold text-white mt-0.5 leading-snug">
            vs {dual.opponent_team_name}
          </p>
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
        View all bouts
        <ChevronRight className="h-3 w-3" />
      </p>
    </button>
  )
}
