import { describe, expect, it } from "vitest"
import { buildTocCredentialRollup } from "@/lib/toc/credential-rollup"
import type { TocFieldAthlete, TocSeedEvidence } from "@/lib/toc/field-board"

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
})
