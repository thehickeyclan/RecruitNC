import { describe, expect, it } from "vitest"
import {
  buildProfileWeightDisplay,
  candidatesFromPublicProfilePayload,
  normalizeWeightClassLabel,
  resolveLastCompetedWeight,
} from "@/lib/last-competed-weight"

describe("normalizeWeightClassLabel", () => {
  it("parses plain and lbs-suffixed weights", () => {
    expect(normalizeWeightClassLabel("116")).toBe("116")
    expect(normalizeWeightClassLabel("116 lbs")).toBe("116")
    expect(normalizeWeightClassLabel(106)).toBe("106")
  })

  it("rejects empty or out-of-range", () => {
    expect(normalizeWeightClassLabel("")).toBeNull()
    expect(normalizeWeightClassLabel("abc")).toBeNull()
    expect(normalizeWeightClassLabel("50")).toBeNull()
  })
})

describe("resolveLastCompetedWeight", () => {
  it("prefers newer year over older", () => {
    const last = resolveLastCompetedWeight([
      { year: 2025, weight: "106", event: "NCHSAA States", priority: 10 },
      { year: 2026, weight: "116", event: "NHSCA Duals", priority: 40 },
    ])
    expect(last).toEqual({ weight: "116", year: 2026, event: "NHSCA Duals" })
  })

  it("uses priority when years match", () => {
    const last = resolveLastCompetedWeight([
      { year: 2026, weight: "106", event: "NCHSAA States", priority: 10 },
      { year: 2026, weight: "116", event: "NHSCA Duals", priority: 40 },
    ])
    expect(last?.weight).toBe("116")
    expect(last?.event).toBe("NHSCA Duals")
  })
})

describe("buildProfileWeightDisplay", () => {
  it("shows last competed as primary when it differs from listed", () => {
    const display = buildProfileWeightDisplay("106", {
      weight: "116",
      year: 2026,
      event: "NHSCA Duals",
    })
    expect(display.displayWeight).toBe("116")
    expect(display.listedWeight).toBe("106")
    expect(display.differsFromListed).toBe(true)
  })

  it("falls back to listed when no tournament weight", () => {
    const display = buildProfileWeightDisplay("106", null)
    expect(display.displayWeight).toBe("106")
    expect(display.differsFromListed).toBe(false)
  })
})

describe("candidatesFromPublicProfilePayload", () => {
  it("includes national team and NHSCA weights", () => {
    const candidates = candidatesFromPublicProfilePayload({
      national_team_results: [{ year: 2026, event: "NHSCA Duals", weight: "116" }],
      nhsca_results: [{ year: 2025, weight: "106" }],
      nchsaa_profile: [{ year: 2025, weight_class: "106" }],
    })
    const last = resolveLastCompetedWeight(candidates)
    expect(last?.weight).toBe("116")
    expect(last?.event).toBe("NHSCA Duals")
  })

  it("prefers Fargo over NHSCA in the same year (July after spring nationals)", () => {
    const candidates = candidatesFromPublicProfilePayload({
      nhsca_results: [{ year: 2026, weight: "150" }],
      fargo_results: [{ year: 2026, weight: "157" }],
    })
    const last = resolveLastCompetedWeight(candidates)
    expect(last).toEqual({ weight: "157", year: 2026, event: "Fargo Nationals" })
  })

  it("uses Fargo display weight when it differs from profile-listed weight", () => {
    const candidates = candidatesFromPublicProfilePayload({
      nhsca_results: [{ year: 2026, weight: "138" }],
      fargo_results: [{ year: 2026, weight: "144" }],
    })
    const last = resolveLastCompetedWeight(candidates)
    const display = buildProfileWeightDisplay("150", last)
    expect(display.displayWeight).toBe("144")
    expect(display.listedWeight).toBe("150")
    expect(display.lastCompeted?.event).toBe("Fargo Nationals")
    expect(display.differsFromListed).toBe(true)
  })
})
