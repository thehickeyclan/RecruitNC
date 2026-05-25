"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { ChevronDown, RotateCw } from "lucide-react"
import type { NhscaDualsWrestlerCardStats } from "@/lib/nhsca-duals-wrestler-card-stats"
import { formatNetTeamPoints } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

function shortRound(round: string) {
  return round.replace(/^Round\s+/i, "R")
}

function weightLabel(weightClass: string) {
  const u = weightClass.trim().toUpperCase()
  return u === "HWT" ? "HWT" : `${weightClass} lbs`
}

function BoutRow({ b }: { b: NhscaDualsWrestlerCardStats["bouts"][number] }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-[11px]",
        b.outcome === "win" ? "border-emerald-500/30 bg-emerald-950/20" : "border-red-500/20 bg-red-950/15"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-white/90">{shortRound(b.roundName)}</span>
        <span
          className={cn(
            "font-black tabular-nums",
            b.teamPoints > 0 ? "text-[#CBAF5D]" : b.teamPoints < 0 ? "text-red-300" : "text-white/40"
          )}
        >
          {formatNetTeamPoints(b.teamPoints)}
        </span>
      </div>
      <p className="text-white/55 truncate mt-0.5">vs {b.opponentTeam}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className={cn("font-bold", b.outcome === "win" ? "text-emerald-400" : "text-red-300")}>
          {b.outcome === "win" ? "W" : "L"} · {b.resultLabel}
        </span>
        {b.opponentWrestler !== "—" ? (
          <span className="text-white/40 truncate max-w-[45%]">{b.opponentWrestler}</span>
        ) : null}
      </div>
    </div>
  )
}

export function DualsWrestlerFlipCard({
  wrestler,
  weightClass,
  imageSrc,
  teamLabel,
  stats,
}: {
  wrestler: string
  weightClass: string
  imageSrc: string
  teamLabel: string
  stats: NhscaDualsWrestlerCardStats | null
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setIsFlipped(false)
    setImageError(false)
  }, [wrestler, weightClass])

  const wt = weightLabel(weightClass)
  const record = stats ? `${stats.wins}–${stats.losses}` : "0–0"
  const teamPts = stats?.teamPointsContributed ?? 0
  const bouts = stats?.bouts ?? []

  return (
    <figure className="mx-auto w-full max-w-[320px]">
      <div className="group [perspective:1200px] h-[340px] sm:h-[380px] w-full">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]"
          )}
        >
          {/* Front */}
          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className={cn(
              "absolute inset-0 h-full w-full overflow-hidden rounded-2xl border border-white/15 bg-[#001a33] shadow-[0_12px_40px_rgba(0,0,0,0.45)] text-left",
              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden]",
              !isFlipped ? "z-20" : "z-10"
            )}
          >
            <div className="relative h-full w-full">
              <Image
                src={imageError ? "/wrestler-silhouette.png" : imageSrc}
                alt={`${wrestler}, ${wt}`}
                fill
                className="object-cover object-[center_15%] scale-[1.02] group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 50vw, 320px"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001428] via-[#001428]/20 to-transparent" />
              <div className="absolute top-3 left-3 rounded-full bg-black/45 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#CBAF5D]">
                {teamLabel}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-xl font-black text-white leading-tight tracking-tight">{wrestler}</h3>
                <p className="text-sm font-semibold text-[#CBAF5D] tabular-nums mt-0.5">{wt}</p>
                {stats && stats.wins + stats.losses > 0 ? (
                  <p className="text-xs text-white/70 mt-2 tabular-nums">
                    {record} · {formatNetTeamPoints(teamPts)} net pts
                  </p>
                ) : null}
                <p className="text-[11px] text-white/45 mt-2 inline-flex items-center gap-1">
                  View stats
                  <ChevronDown className="h-3 w-3 rotate-[-90deg]" aria-hidden />
                </p>
              </div>
            </div>
          </button>

          {/* Back */}
          <div
            className={cn(
              "absolute inset-0 h-full w-full overflow-hidden rounded-2xl border border-[#CBAF5D]/30 bg-[#0a1638] shadow-lg",
              "[backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]",
              isFlipped ? "z-20" : "z-10"
            )}
          >
            <div className="p-3.5 h-full flex flex-col min-h-0">
              <div className="flex items-start justify-between gap-2 mb-3 shrink-0">
                <div className="min-w-0 text-left">
                  <h3 className="text-base font-bold text-white truncate">{wrestler}</h3>
                  <p className="text-xs text-[#CBAF5D] tabular-nums">{wt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="shrink-0 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/10 text-white hover:bg-white/15 transition-colors"
                  aria-label="Flip to front"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
                <div className="rounded-xl bg-[#002147]/80 border border-white/10 p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Record</p>
                  <p className="text-2xl font-black text-white tabular-nums">{record}</p>
                </div>
                <div className="rounded-xl bg-[#002147]/80 border border-white/10 p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-white/45">Net pts</p>
                  <p
                    className={cn(
                      "text-2xl font-black tabular-nums",
                      teamPts >= 0 ? "text-[#CBAF5D]" : "text-red-300"
                    )}
                  >
                    {formatNetTeamPoints(teamPts)}
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pr-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 sticky top-0 bg-[#0a1638] py-1">
                  Bout log
                </p>
                {bouts.length === 0 ? (
                  <p className="text-xs text-white/50 text-center py-6">No bouts recorded.</p>
                ) : (
                  bouts.map((b, i) => <BoutRow key={`${b.roundName}-${b.opponentTeam}-${i}`} b={b} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="sr-only">
        {wrestler}, {wt}
      </figcaption>
    </figure>
  )
}
