"use client"

import { DualsTeamWrestlerCards } from "@/components/national-team/duals-team-wrestler-cards"
import { getNationalWrestlerCardsSorted } from "@/lib/nhsca-duals-2026-national-wrestler-cards"

export function NationalTeamWrestlerCards({ className }: { className?: string }) {
  const cards = getNationalWrestlerCardsSorted()
  if (cards.length === 0) return null
  return <DualsTeamWrestlerCards cards={cards} teamLabel="National" className={className} />
}
