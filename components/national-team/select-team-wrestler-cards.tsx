"use client"

import { DualsTeamWrestlerCards } from "@/components/national-team/duals-team-wrestler-cards"
import {
  getSelectWrestlerCardsPendingCount,
  getSelectWrestlerCardsWithArt,
} from "@/lib/nhsca-duals-2026-select-wrestler-cards"

export function SelectTeamWrestlerCards({ className }: { className?: string }) {
  const cards = getSelectWrestlerCardsWithArt()
  const pending = getSelectWrestlerCardsPendingCount()
  if (cards.length === 0 && pending === 0) return null
  return (
    <DualsTeamWrestlerCards
      cards={cards}
      teamLabel="Select"
      pendingCount={pending}
      className={className}
    />
  )
}
