import { describe, expect, it } from "vitest"
import { buildTocCredentialRollup, rankTocWeightBrackets } from "@/lib/toc/credential-rollup"
import type { TocFieldAthlete, TocSeedEvidence, TocWeightBoard } from "@/lib/toc/field-board"

function athlete(name: string, summary: TocSeedEvidence["summary"]): TocFieldAthlete {
  return {
    invitationId: name,
    athleteId: name,
    name,
    school: null,
    graduationYear: 2027,
    status: "confirmed",
    seed: null,
    jacketSize: null,
    invitedAt: null,
    confirmedAt: null,
    seedEvidence: { nchsaa: [], nhsca: [], super32: [], fargo: [], headToHead: [], summary },
  }
}

function weight(weightClass: number, athletes: TocFieldAthlete[]): TocWeightBoard {
  return {
    weightClass,
    maxSlots: 12,
    confirmedCount: athletes.length,
    invitedCount: 0,
    openConfirmedSlots: Math.max(0, 8 - athletes.length),
    athletes,
  }
}

describe("TOC credential rollup", () => {
  it("counts unique credentialed wrestlers and sums finishes and records", () => {
    const result = buildTocCredentialRollup([
      athlete("One", { stateTitles: 2, statePlacements: 2, nhscaAllAmericanFinishes: 1, fargoAllAmericanFinishes: 0, nhscaWins: 8, nhscaLosses: 2, super32Wins: 1, super32Losses: 2, fargoWins: 5, fargoLosses: 2 }),
      athlete("Two", { stateTitles: 0, statePlacements: 1, nhscaAllAmericanFinishes: 0, fargoAllAmericanFinishes: 1, nhscaWins: 3, nhscaLosses: 2, super32Wins: 2, super32Losses: 2, fargoWins: 6, fargoLosses: 2 }),
    ])
    expect(result).toMatchObject({
      athleteCount: 2,
      stateChampionAthletes: 1,
      stateTitles: 2,
      statePlacerAthletes: 2,
      statePlacements: 3,
      allAmericanAthletes: 2,
      allAmericanFinishes: 2,
      nhscaWins: 11,
      nhscaLosses: 4,
      super32Wins: 3,
      super32Losses: 4,
      fargoWins: 11,
      fargoLosses: 4,
    })
  })

  it("ranks bracket résumés with All-Americans and state champions carrying the most weight", () => {
    const blank = { stateTitles: 0, statePlacements: 0, nhscaAllAmericanFinishes: 0, fargoAllAmericanFinishes: 0, nhscaWins: 0, nhscaLosses: 0, super32Wins: 0, super32Losses: 0, fargoWins: 0, fargoLosses: 0 }
    const rankings = rankTocWeightBrackets([
      weight(141, [athlete("State placer", { ...blank, statePlacements: 1, super32Wins: 3, super32Losses: 2 })]),
      weight(149, [athlete("National AA", { ...blank, stateTitles: 1, statePlacements: 2, nhscaAllAmericanFinishes: 1, nhscaWins: 8, nhscaLosses: 2 })]),
      weight(157, [athlete("State champ", { ...blank, stateTitles: 1, statePlacements: 1 })]),
    ])

    expect(rankings.map(({ weightClass, rank }) => ({ weightClass, rank }))).toEqual([
      { weightClass: 149, rank: 1 },
      { weightClass: 157, rank: 2 },
      { weightClass: 141, rank: 3 },
    ])
  })
})
