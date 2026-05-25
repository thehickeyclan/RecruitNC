"use client"

import { DualsTeamWrestlerCards } from "@/components/national-team/duals-team-wrestler-cards"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { getNationalWrestlerCardsSorted } from "@/lib/nhsca-duals-2026-national-wrestler-cards"

export function NationalTeamWrestlerCards({
  className,
  resultsSnapshot,
  variant = "hub",
  bigWins = [],
}: {
  className?: string
  resultsSnapshot?: NhscaDualsResultsSnapshot | null
  variant?: "hub" | "archive"
  bigWins?: NhscaDualsBigWin[]
}) {
  const cards = getNationalWrestlerCardsSorted()
  if (cards.length === 0) return null
  return (
    <DualsTeamWrestlerCards
      cards={cards}
      teamLabel="National"
      className={className}
      resultsSnapshot={resultsSnapshot}
      variant={variant}
      bigWins={bigWins}
    />
  )
}
