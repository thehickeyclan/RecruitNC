import { describe, expect, it } from "vitest"
import {
  DEFAULT_FUNNEL_GOAL_CENTS,
  milestonesCentsForGoal,
  roundStepDollars,
} from "@/lib/fundraising/milestone-trail"

describe("milestonesCentsForGoal", () => {
  it("default / $1k goal uses quarter-thousand steps only", () => {
    expect(milestonesCentsForGoal(DEFAULT_FUNNEL_GOAL_CENTS)).toEqual([25000, 50000, 75000, 100000])
  })

  it("also uses $250 steps for any custom $1k goal", () => {
    expect(milestonesCentsForGoal(1000 * 100)).toEqual([25000, 50000, 75000, 100000])
  })

  it("does not emit tiers above the goal (no 50k when goal is 1k)", () => {
    const m = milestonesCentsForGoal(DEFAULT_FUNNEL_GOAL_CENTS)
    expect(Math.max(...m)).toBe(DEFAULT_FUNNEL_GOAL_CENTS)
    expect(m).not.toContain(50000 * 100)
  })

  it("scales custom goals to a short ladder ending at goal", () => {
    expect(milestonesCentsForGoal(5000 * 100)).toEqual([100000, 200000, 300000, 400000, 500000])
    expect(milestonesCentsForGoal(2500 * 100)).toEqual([50000, 100000, 150000, 200000, 250000])
  })
})

describe("roundStepDollars", () => {
  it("rounds to human axis steps", () => {
    expect(roundStepDollars(150)).toBe(200)
    expect(roundStepDollars(240)).toBe(500)
    expect(roundStepDollars(750)).toBe(1000)
    expect(roundStepDollars(1200)).toBe(2000)
  })
})
