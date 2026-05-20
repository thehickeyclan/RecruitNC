"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { DualsWrestlerFlipCard } from "@/components/national-team/duals-wrestler-flip-card"
import {
  cardStatsKey,
  type NhscaDualsWrestlerCardStats,
} from "@/lib/nhsca-duals-wrestler-card-stats"
import { cn } from "@/lib/utils"

export type DualsWrestlerCardItem = {
  weightClass: string
  wrestler: string
  imageSrc: string
}

type StatsResponse = {
  ready: boolean
  stats: Record<string, NhscaDualsWrestlerCardStats>
}

export function DualsTeamWrestlerCards({
  cards,
  teamLabel,
  pendingCount = 0,
  className,
}: {
  cards: DualsWrestlerCardItem[]
  teamLabel: "National" | "Select"
  /** Wrestlers on roster without card art yet */
  pendingCount?: number
  className?: string
}) {
  const teamApi = teamLabel === "Select" ? "select" : "national"
  const [statsByKey, setStatsByKey] = useState<Record<string, NhscaDualsWrestlerCardStats>>({})
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`/api/national-team/duals-wrestler-stats?team=${teamApi}`, {
        credentials: "include",
      })
      if (!r.ok) return
      const json = (await r.json()) as StatsResponse
      if (json.stats) setStatsByKey(json.stats)
    } catch {
      /* roster cards still render without live stats */
    } finally {
      setStatsLoading(false)
    }
  }, [teamApi])

  useEffect(() => {
    setStatsLoading(true)
    void loadStats()
    const id = window.setInterval(() => void loadStats(), 15_000)
    return () => window.clearInterval(id)
  }, [loadStats])

  if (cards.length === 0 && pendingCount === 0) return null

  return (
    <div className={cn("px-5 py-5 md:px-6 md:py-6 border-b border-white/10", className)}>
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">Team cards</h3>
        <p className="text-xs text-white/65 mt-1">
          Representing NC at NHSCA Duals 2026 — {teamLabel} team. Tap a card to flip for live duals stats.
        </p>
        {statsLoading ? (
          <p className="text-xs text-white/40 mt-2 flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Loading live results…
          </p>
        ) : null}
        {pendingCount > 0 ? (
          <p className="text-xs text-[#CBAF5D]/90 mt-2">
            {pendingCount} card{pendingCount === 1 ? "" : "s"} coming soon — contact table below has full roster.
          </p>
        ) : null}
      </div>
      {cards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {cards.map((card) => (
            <DualsWrestlerFlipCard
              key={`${card.weightClass}-${card.wrestler}`}
              wrestler={card.wrestler}
              weightClass={card.weightClass}
              imageSrc={card.imageSrc}
              teamLabel={teamLabel}
              stats={statsByKey[cardStatsKey(card.weightClass, card.wrestler)] ?? null}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
