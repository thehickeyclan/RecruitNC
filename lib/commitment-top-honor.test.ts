import { describe, expect, it } from "vitest"
import { topHonor } from "./commitment-top-honor"

const f = (o: Partial<Parameters<typeof topHonor>[0] & object>) => ({ stateTitleYears: [], bestStatePlace: null, stateQualifier: false, allAmericanFinishes: [], ...o })

describe("topHonor", () => {
  it("counts state titles by year", () => {
    expect(topHonor(f({ stateTitleYears: [2025, 2026], bestStatePlace: 1, stateQualifier: true }))).toBe("2x State Champ")
    expect(topHonor(f({ stateTitleYears: [2026, 2026], bestStatePlace: 1 }))).toBe("State Champ")
  })
  it("leads with All-Americans and keeps a state title beside them", () => {
    expect(topHonor(f({ allAmericanFinishes: ["nhsca|2025", "super32|2025"], stateTitleYears: [2026], bestStatePlace: 1 }))).toBe("2x All-American · State Champ")
    expect(topHonor(f({ allAmericanFinishes: ["nhsca|2026"], bestStatePlace: 3, stateQualifier: true }))).toBe("All-American")
  })
  it("falls back to placer, then qualifier, then nothing", () => {
    expect(topHonor(f({ bestStatePlace: 4, stateQualifier: true }))).toBe("State Placer")
    expect(topHonor(f({ stateQualifier: true }))).toBe("State Qualifier")
    expect(topHonor(f({}))).toBeNull()
  })
})
