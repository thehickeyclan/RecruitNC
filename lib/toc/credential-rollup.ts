import type { TocFieldAthlete } from "@/lib/toc/field-board"

export type TocCredentialRollup = {
  athleteCount: number
  stateChampionAthletes: number
  stateTitles: number
  statePlacerAthletes: number
  statePlacements: number
  allAmericanAthletes: number
  allAmericanFinishes: number
  nhscaWins: number
  nhscaLosses: number
  super32Wins: number
  super32Losses: number
  fargoWins: number
  fargoLosses: number
}

export function buildTocCredentialRollup(athletes: TocFieldAthlete[]): TocCredentialRollup {
  const confirmed = athletes.filter((athlete) => athlete.status === "confirmed" && athlete.seedEvidence)
  const rollup: TocCredentialRollup = {
    athleteCount: confirmed.length,
    stateChampionAthletes: 0,
    stateTitles: 0,
    statePlacerAthletes: 0,
    statePlacements: 0,
    allAmericanAthletes: 0,
    allAmericanFinishes: 0,
    nhscaWins: 0,
    nhscaLosses: 0,
    super32Wins: 0,
    super32Losses: 0,
    fargoWins: 0,
    fargoLosses: 0,
  }

  for (const athlete of confirmed) {
    const summary = athlete.seedEvidence!.summary
    if (summary.stateTitles > 0) rollup.stateChampionAthletes += 1
    if (summary.statePlacements > 0) rollup.statePlacerAthletes += 1
    const aaFinishes = summary.nhscaAllAmericanFinishes + summary.fargoAllAmericanFinishes
    if (aaFinishes > 0) rollup.allAmericanAthletes += 1
    rollup.stateTitles += summary.stateTitles
    rollup.statePlacements += summary.statePlacements
    rollup.allAmericanFinishes += aaFinishes
    rollup.nhscaWins += summary.nhscaWins
    rollup.nhscaLosses += summary.nhscaLosses
    rollup.super32Wins += summary.super32Wins
    rollup.super32Losses += summary.super32Losses
    rollup.fargoWins += summary.fargoWins
    rollup.fargoLosses += summary.fargoLosses
  }

  return rollup
}
