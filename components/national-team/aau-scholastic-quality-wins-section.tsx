"use client"

import { cn } from "@/lib/utils"
import type { AauScholasticQualityWinsSummary } from "@/lib/aau-scholastic-duals-2026-quality-wins"

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
