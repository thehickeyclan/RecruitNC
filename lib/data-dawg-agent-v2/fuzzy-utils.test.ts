import { describe, expect, it } from "vitest"
import { combinedAthleteSearchScore, scoreAthleteNameMatch } from "./fuzzy-utils"

describe("scoreAthleteNameMatch — two-token surname hygiene", () => {
  it("caps score when last names disagree (Tyler Tracy vs Tyler Gardner)", () => {
    const s = scoreAthleteNameMatch("tyler tracy", "Tyler", "Gardner", "Tyler Gardner")
    expect(s).toBeLessThanOrEqual(0.2)
  })

  it("stays high for exact two-token match", () => {
    const s = scoreAthleteNameMatch("tyler tracy", "Tyler", "Tracy", "Tyler Tracy")
    expect(s).toBeGreaterThan(0.9)
  })
})

describe("combinedAthleteSearchScore — school boost cannot bury surname mismatch", () => {
  it("keeps wrong surname below naive threshold when school matches", () => {
    const phrase = "tyler tracy jacksonville"
    const tokens = ["tyler", "tracy", "jacksonville"]
    const score = combinedAthleteSearchScore(
      phrase,
      tokens,
      "Tyler",
      "Gardner",
      "Tyler Gardner",
      "Jacksonville High School",
    )
    expect(score).toBeLessThan(0.28)
  })
})
