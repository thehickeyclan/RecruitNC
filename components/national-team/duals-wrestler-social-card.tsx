"use client"

import { useState } from "react"
import Image from "next/image"
import { Trophy } from "lucide-react"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
import type { NhscaDualsWrestlerCardStats } from "@/lib/nhsca-duals-wrestler-card-stats"
import { formatNetTeamPoints } from "@/lib/nhsca-duals-live-results/scoring"
import { cn } from "@/lib/utils"

function weightLabel(weightClass: string) {
  const u = weightClass.trim().toUpperCase()
  return u === "HWT" ? "HWT" : `${weightClass} lbs`
}

function BigWinLine({ win }: { win: NhscaDualsBigWin }) {
  const score = win.scoreLine ? ` ${win.scoreLine}` : ""
  return (
    <li className="text-[11px] leading-snug text-white/85">
      <span className="font-semibold text-emerald-300">W</span>
      {" · "}
      def. {win.opponentName}
      {win.highlight ? (
        <span className="text-amber-200/90"> ({win.highlight})</span>
      ) : null}
      <span className="text-white/45">
        {" "}
        — {win.resultLabel}
        {score}
      </span>
    </li>
  )
}

/** Front-only athlete card — photo, record, big wins (social / archive friendly). */
export function DualsWrestlerSocialCard({
  wrestler,
  weightClass,
  imageSrc,
  teamLabel,
  stats,
  bigWins = [],
}: {
  wrestler: string
  weightClass: string
  imageSrc: string
  teamLabel: string
  stats: NhscaDualsWrestlerCardStats | null
  bigWins?: NhscaDualsBigWin[]
}) {
  const [imageError, setImageError] = useState(false)
  const wt = weightLabel(weightClass)
  const record = stats ? `${stats.wins}–${stats.losses}` : "0–0"
  const net = stats?.teamPointsContributed ?? 0
  const hasBouts = stats ? stats.wins + stats.losses > 0 : false

  return (
    <article className="flex flex-col rounded-xl sm:rounded-2xl border border-white/12 bg-[#0a1638] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)] h-full">
      <div className="relative aspect-[3/4] w-full bg-[#001428]">
        <Image
          src={imageError ? "/wrestler-silhouette.png" : imageSrc}
          alt={`${wrestler}, ${wt}`}
          fill
          className="object-cover object-[center_15%]"
          sizes="(max-width: 640px) 45vw, 280px"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1638] via-transparent to-transparent pointer-events-none" />
        <span className="absolute top-2 left-2 rounded-full bg-black/55 backdrop-blur-sm px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wide text-[#CBAF5D]">
          {teamLabel}
        </span>
      </div>

      <div className="px-2.5 sm:px-3 py-2.5 sm:py-3 border-t border-white/10 flex-1 flex flex-col">
        <h3 className="text-sm sm:text-base font-black text-white leading-tight line-clamp-2">{wrestler}</h3>
        <p className="text-[11px] sm:text-xs font-semibold text-[#CBAF5D] tabular-nums mt-0.5">{wt}</p>

        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2">
          <div className="rounded-lg bg-[#002147]/80 border border-white/8 px-1.5 sm:px-2 py-1.5 text-center">
            <p className="text-[8px] sm:text-[9px] uppercase tracking-wide text-white/45">Record</p>
            <p className="text-base sm:text-lg font-black text-white tabular-nums leading-none mt-0.5">{record}</p>
          </div>
          <div className="rounded-lg bg-[#002147]/80 border border-white/8 px-1.5 sm:px-2 py-1.5 text-center">
            <p className="text-[8px] sm:text-[9px] uppercase tracking-wide text-white/45">Net pts</p>
            <p
              className={cn(
                "text-base sm:text-lg font-black tabular-nums leading-none mt-0.5",
                net >= 0 ? "text-[#CBAF5D]" : "text-red-300"
              )}
            >
              {formatNetTeamPoints(net)}
            </p>
          </div>
        </div>

        {bigWins.length > 0 ? (
          <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-white/8 flex-1">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#CBAF5D]/80 flex items-center gap-1 mb-1.5">
              <Trophy className="h-3 w-3 shrink-0" aria-hidden />
              Big wins
            </p>
            <ul className="space-y-1 sm:space-y-1.5">
              {bigWins.map((w) => (
                <BigWinLine key={w.id} win={w} />
              ))}
            </ul>
          </div>
        ) : hasBouts ? null : (
          <p className="mt-2 text-[10px] text-white/35 text-center">NHSCA Duals 2026</p>
        )}
      </div>
    </article>
  )
}
