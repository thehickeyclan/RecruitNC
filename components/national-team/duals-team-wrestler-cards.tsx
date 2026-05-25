"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { DualsWrestlerFlipCard } from "@/components/national-team/duals-wrestler-flip-card"
import type { NhscaDualsResultsSnapshot, NhscaDualsTeamType } from "@/lib/nhsca-duals-live-results/types"
import {
  buildTeamWrestlerStatsIndex,
  cardStatsKey,
  type NhscaDualsWrestlerCardStats,
} from "@/lib/nhsca-duals-wrestler-card-stats"
import { NHSCA_DUALS_RESULTS_UPDATED } from "@/lib/nhsca-duals-results-events"
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
  resultsSnapshot,
  variant = "hub",
}: {
  cards: DualsWrestlerCardItem[]
  teamLabel: "National" | "Select"
  pendingCount?: number
  className?: string
  resultsSnapshot?: NhscaDualsResultsSnapshot | null
  variant?: "hub" | "archive"
}) {
  const teamApi = teamLabel === "Select" ? "select" : "national"
  const teamType: NhscaDualsTeamType = teamLabel === "Select" ? "select" : "national"
  const [statsByKey, setStatsByKey] = useState<Record<string, NhscaDualsWrestlerCardStats>>({})
  const [statsLoading, setStatsLoading] = useState(!resultsSnapshot)

  const snapshotStats = useMemo(() => {
    if (!resultsSnapshot?.teams?.length) return null
    return buildTeamWrestlerStatsIndex(
      resultsSnapshot,
      teamType,
      cards.map((c) => ({ wrestler: c.wrestler, weightClass: c.weightClass }))
    )
  }, [resultsSnapshot, teamType, cards])

  const effectiveStats = useMemo(() => snapshotStats ?? statsByKey, [snapshotStats, statsByKey])

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`/api/national-team/duals-wrestler-stats?team=${teamApi}&_=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
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
    if (resultsSnapshot) {
      setStatsLoading(false)
      return
    }
    setStatsLoading(true)
    void loadStats()
    const id = window.setInterval(() => void loadStats(), 15_000)
    return () => window.clearInterval(id)
  }, [loadStats, resultsSnapshot])

  useEffect(() => {
    const onUpdated = () => void loadStats()
    window.addEventListener(NHSCA_DUALS_RESULTS_UPDATED, onUpdated)
    return () => window.removeEventListener(NHSCA_DUALS_RESULTS_UPDATED, onUpdated)
  }, [loadStats])

  if (cards.length === 0 && pendingCount === 0) return null

  return (
    <div className={cn(variant === "archive" ? "px-4 py-5 sm:px-5" : "px-5 py-5 md:px-6 md:py-6 border-b border-white/10", className)}>
      {variant === "hub" ? (
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
      ) : (
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#CBAF5D]/80 mb-4">{teamLabel} team</p>
      )}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {cards.map((card) => {
            const s = effectiveStats[cardStatsKey(card.weightClass, card.wrestler)]
            const statsKey = s ? `${s.wins}-${s.losses}-${s.bouts.length}` : "0"
            return (
            <DualsWrestlerFlipCard
              key={`${card.weightClass}-${card.wrestler}-${statsKey}`}
              wrestler={card.wrestler}
              weightClass={card.weightClass}
              imageSrc={card.imageSrc}
              teamLabel={teamLabel}
              stats={s ?? null}
            />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
