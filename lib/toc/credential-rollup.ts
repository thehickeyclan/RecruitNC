import type { TocFieldAthlete, TocWeightBoard } from "@/lib/toc/field-board"

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

export type TocBracketWatchRanking = {
  weightClass: number
  rank: number
  score: number
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

/** Rank populated brackets by the strength and depth of their verified résumés. */
export function rankTocWeightBrackets(weights: TocWeightBoard[]): TocBracketWatchRanking[] {
  const scored = weights.flatMap((weight) => {
    const rollup = buildTocCredentialRollup(weight.athletes)
    if (rollup.athleteCount === 0) return []

    const nationalWins = rollup.nhscaWins + rollup.super32Wins + rollup.fargoWins
    const nationalLosses = rollup.nhscaLosses + rollup.super32Losses + rollup.fargoLosses
    const nationalMatches = nationalWins + nationalLosses
    const nationalWinRate = nationalMatches > 0 ? nationalWins / nationalMatches : 0
    const score =
      rollup.allAmericanAthletes * 32 +
      rollup.allAmericanFinishes * 10 +
      rollup.stateChampionAthletes * 22 +
      rollup.stateTitles * 7 +
      rollup.statePlacerAthletes * 8 +
      rollup.statePlacements * 3 +
      nationalWins * 1.25 +
      nationalWinRate * 8

    return [{ weightClass: weight.weightClass, score: Math.round(score * 10) / 10 }]
  })

  return scored
    .sort((a, b) => b.score - a.score || a.weightClass - b.weightClass)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}
