"use client"

import { DualsTeamWrestlerCards } from "@/components/national-team/duals-team-wrestler-cards"
import type { NhscaDualsBigWin } from "@/lib/nhsca-duals-big-wins"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import {
  getSelectWrestlerCardsPendingCount,
  getSelectWrestlerCardsWithArt,
} from "@/lib/nhsca-duals-2026-select-wrestler-cards"

export function SelectTeamWrestlerCards({
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
  const cards = getSelectWrestlerCardsWithArt()
  const pending = getSelectWrestlerCardsPendingCount()
  if (cards.length === 0 && pending === 0) return null
  return (
    <DualsTeamWrestlerCards
      cards={cards}
      teamLabel="Select"
      pendingCount={pending}
      className={className}
      resultsSnapshot={resultsSnapshot}
      variant={variant}
      bigWins={bigWins}
    />
  )
}
