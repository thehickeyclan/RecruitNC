"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { RotateCw } from "lucide-react"
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
    <figure className="mx-auto w-full max-w-[350px]">
      <div className="perspective-1000 h-[360px] sm:h-[420px] md:h-[480px] w-full">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-700 preserve-3d",
            isFlipped && "rotate-y-180"
          )}
        >
          <Card
            className={cn(
              "absolute inset-0 h-full w-full overflow-hidden rounded-xl border-2 border-white/10 shadow-lg backface-hidden cursor-pointer p-0 gap-0",
              !isFlipped ? "z-20" : "z-10"
            )}
            onClick={() => setIsFlipped(true)}
          >
            <div className="relative h-full w-full">
              <Image
                src={imageError ? "/wrestler-silhouette.png" : imageSrc}
                alt={`${wrestler}, ${wt} — NC United ${teamLabel}`}
                fill
                className="object-cover object-center [object-position:center_18%]"
                sizes="(max-width: 640px) 100vw, 350px"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#001a33]/95 via-[#001a33]/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-center text-white">
                <h3 className="text-xl font-black leading-tight">{wrestler}</h3>
                <p className="text-sm font-semibold text-[#CBAF5D] tabular-nums mt-1">{wt}</p>
                <p className="text-[11px] text-white/55 mt-2">NHSCA Duals 2026 · {teamLabel}</p>
                <p className="text-xs text-white/45 mt-1">Tap to flip</p>
              </div>
            </div>
          </Card>

          <Card
            className={cn(
              "absolute inset-0 h-full w-full overflow-auto rounded-xl border-2 border-[#CBAF5D]/30 shadow-lg backface-hidden card-back p-0 gap-0",
              isFlipped ? "z-20" : "z-10"
            )}
            style={{
              transform: "rotateY(180deg)",
              WebkitTransform: "rotateY(180deg)",
              backgroundColor: "#0D1A4D",
            }}
          >
            <div className="p-3.5 min-h-full flex flex-col">
              <div
                className="flex items-start justify-between gap-2 mb-3 sticky top-0 py-1 -mt-1 z-10"
                style={{ backgroundColor: "rgba(13, 26, 77, 0.97)" }}
              >
                <div className="min-w-0 text-left">
                  <h3 className="text-base font-bold text-white truncate">{wrestler}</h3>
                  <p className="text-xs text-[#CBAF5D] tabular-nums">{wt}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFlipped(false)
                  }}
                  className="shrink-0 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#B31B1B] text-white shadow-md"
                  aria-label="Flip to front"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-lg bg-[#002147] border border-[#CBAF5D]/35 p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Duals record</p>
                  <p className="text-2xl font-black text-white tabular-nums mt-0.5">{record}</p>
                </div>
                <div className="rounded-lg bg-[#002147] border border-[#CBAF5D]/35 p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-white/50">Net team pts</p>
                  <p
                    className={cn(
                      "text-2xl font-black tabular-nums mt-0.5",
                      teamPts >= 0 ? "text-[#CBAF5D]" : "text-red-300"
                    )}
                  >
                    {formatNetTeamPoints(teamPts)}
                  </p>
                </div>
              </div>

              <div className="flex-1 rounded-lg overflow-hidden border border-white/10 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#CBAF5D] bg-[#0a2040] px-2 py-1.5 text-center">
                  Bout results by round
                </p>
                {bouts.length === 0 ? (
                  <p className="text-xs text-white/55 text-center px-3 py-6 leading-relaxed">
                    No bouts recorded yet. Scores update live on the Results tab during the event.
                  </p>
                ) : (
                  <div>
                    <p className="text-[9px] text-white/40 text-center py-1 sm:hidden">Swipe table for full details →</p>
                    <div className="overflow-x-auto">
                    <table className="w-full text-[10px] text-white">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="text-left py-1.5 pl-2 pr-1 font-semibold">Round</th>
                          <th className="text-left py-1.5 px-1 font-semibold">vs</th>
                          <th className="text-center py-1.5 px-1 font-semibold">Rslt</th>
                          <th className="text-right py-1.5 pr-2 pl-1 font-semibold">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bouts.map((b, i) => (
                          <tr
                            key={`${b.roundName}-${b.opponentTeam}-${i}`}
                            className={cn(
                              "border-b border-white/8",
                              b.outcome === "win" ? "bg-green-950/25" : b.outcome === "loss" ? "bg-red-950/20" : ""
                            )}
                          >
                            <td className="py-1.5 pl-2 pr-1 align-top">
                              <span className="font-semibold text-white/90">{shortRound(b.roundName)}</span>
                              <span className="block text-[9px] text-white/40">{b.dayName}</span>
                            </td>
                            <td className="py-1.5 px-1 align-top">
                              <span className="font-medium text-white/85 block truncate max-w-[7rem]">
                                {b.opponentTeam}
                              </span>
                              {b.opponentWrestler !== "—" ? (
                                <span className="text-[9px] text-white/40 block truncate max-w-[7rem]">
                                  {b.opponentWrestler}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-1.5 px-1 text-center align-top">
                              <span
                                className={cn(
                                  "font-bold",
                                  b.outcome === "win" ? "text-green-400" : b.outcome === "loss" ? "text-red-300" : "text-white/60"
                                )}
                              >
                                {b.outcome === "win" ? "W" : b.outcome === "loss" ? "L" : "—"}
                              </span>
                              <span className="block text-[9px] text-white/45">{b.resultLabel}</span>
                              {b.note ? (
                                <span className="block text-[9px] text-amber-200/70 truncate max-w-[4.5rem]">{b.note}</span>
                              ) : null}
                            </td>
                            <td
                              className={cn(
                                "py-1.5 pr-2 pl-1 text-right align-top font-bold tabular-nums",
                                b.teamPoints > 0 ? "text-[#CBAF5D]" : b.teamPoints < 0 ? "text-red-300" : "text-white/40"
                              )}
                            >
                              {formatNetTeamPoints(b.teamPoints)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-[#001a33] font-bold">
                          <td colSpan={3} className="py-1.5 pl-2 text-white/70">
                            Total contributed
                          </td>
                          <td
                            className={cn(
                              "py-1.5 pr-2 text-right tabular-nums",
                              teamPts >= 0 ? "text-[#CBAF5D]" : "text-red-300"
                            )}
                          >
                            {formatNetTeamPoints(teamPts)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <figcaption className="mt-2 text-center sr-only">
        {wrestler}, {wt}
      </figcaption>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }
        @media (max-width: 640px) {
          .card-back {
            transform: translateZ(0);
            -webkit-transform: translateZ(0);
          }
        }
      `}</style>
    </figure>
  )
}
