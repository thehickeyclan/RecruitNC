import { describe, expect, it } from "vitest"

import { isBalanced, journeySteps, type JourneyInput, type JourneySchool } from "./journey"

const base: JourneyInput = { firstName: "Jake", grade: "junior", schools: [], rulesSeen: false, allowedLine: null, upcomingEvents: 0, unreadMessages: 0, upcomingVisits: 0, visitsToConfirm: 0 }
const school = (over: Partial<JourneySchool> = {}): JourneySchool => ({ status: "interested", level: "D1", interest: null, formDone: false, emailed: false, ...over })

describe("journeySteps", () => {
  it("a new family sees step 1 open and the rest waiting", () => {
    const steps = journeySteps(base)
    expect(steps.map((s) => s.status)).toEqual(["now", "later", "later", "later", "later"])
    expect(steps[0].cta.href).toBe("/recruiting/college-map")
    expect(steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5])
  })

  it("a family with 23 schools across levels, most reached, sees mostly ticks (the Amiotts, 28 Oct 2026)", () => {
    const schools = [
      ...Array.from({ length: 16 }, (_, i) => school({ status: "contacted", level: i % 2 ? "D1" : "D2", formDone: true })),
      ...Array.from({ length: 3 }, () => school({ status: "talking", level: "D3", formDone: true })),
      ...Array.from({ length: 4 }, () => school({ level: "NAIA" })),
    ]
    const steps = journeySteps({ ...base, schools, rulesSeen: true, upcomingEvents: 2 })
    expect(steps.map((s) => s.status)).toEqual(["done", "done", "done", "done", "done"])
    expect(steps[3].label).toBe("19 of 23 schools reached")
  })

  it("an all-Division I list of 12 is not selected yet", () => {
    const steps = journeySteps({ ...base, schools: Array.from({ length: 12 }, () => school()) })
    expect(steps[0].status).toBe("done")
    expect(steps[1].status).toBe("now")
    expect(steps[1].label).toBe("12 schools, one level")
  })

  it("monitor waits on unread messages first", () => {
    const steps = journeySteps({ ...base, unreadMessages: 2, upcomingEvents: 1 })
    expect(steps[4].label).toBe("2 messages waiting")
    expect(steps[4].cta.href).toBe("/inbox")
  })

  it("balance needs two levels", () => {
    expect(isBalanced(["D1", "D1"])).toBe(false)
    expect(isBalanced(["D1", "D3"])).toBe(true)
  })
})
