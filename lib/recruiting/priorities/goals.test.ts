import { describe, expect, it } from "vitest"
import { GOALS, GOALS_FACTS, PARENT_GOAL_LABELS, goalsAreLastSeason, goalsNudge, goalsOf, rankedGoals } from "./goals"

const from = (o: Record<string, unknown>) => (k: string) => o[k]

describe("goals first", () => {
  it("reads the goals answer, at most three, known keys only", () => {
    expect(goalsOf(from({ goals: ["career", "career", "bogus", "level", "pay", "team"] }))).toEqual(["career", "level", "pay"])
  })
  it("maps a set answered before 6 Nov, keeping each factor's old rank", () => {
    expect(rankedGoals(from({ top3: ["cost", "distance", "level"] }))).toEqual([{ goal: "pay", rank: 0 }, { goal: "level", rank: 2 }])
    expect(goalsOf(from({ top3: ["campus", "coaching", "compete_early"] }))).toEqual(["experience", "team", "compete"])
    expect(goalsOf(from({ level_vs_opportunity: "opportunity" }))).toEqual(["compete"])
    expect(goalsOf(from({ goals: ["career"], top3: ["level"] }))).toEqual(["career"])
    expect(goalsOf(from({}))).toEqual([])
  })
  it("nudges a top 3 with nothing about school or after wrestling, and only that", () => {
    expect(goalsNudge(["level", "compete", "team"])).toMatch(/what comes after wrestling/)
    expect(goalsNudge(["level", "compete", "career"])).toBeNull()
    expect(goalsNudge(["level", "pay", "team"])).toBeNull()
    expect(goalsNudge([])).toBeNull()
  })
  it("asks again once a season", () => {
    const nov = new Date("2026-11-06T12:00:00Z")
    expect(goalsAreLastSeason("2026-10-01T00:00:00Z", nov)).toBe(false)
    expect(goalsAreLastSeason("2026-07-15T00:00:00Z", nov)).toBe(true)
    expect(goalsAreLastSeason("2026-10-01T00:00:00Z", new Date("2027-07-31T12:00:00Z"))).toBe(false)
    expect(goalsAreLastSeason("2026-10-01T00:00:00Z", new Date("2027-08-01T12:00:00Z"))).toBe(true)
    expect(goalsAreLastSeason(null, nov)).toBe(false)
  })
  it("copy: plain, no questions, no room or spot, no income, no singular they", () => {
    const all = JSON.stringify([GOALS, PARENT_GOAL_LABELS, GOALS_FACTS])
    expect(all).not.toContain("?")
    expect(all).not.toMatch(/\broom\b|\bspot\b|income|\bthey\b|\btheir\b/i)
    expect(Object.keys(PARENT_GOAL_LABELS)).toEqual(GOALS.map((g) => g.key))
  })
})
