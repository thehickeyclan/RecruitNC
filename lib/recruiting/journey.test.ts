import { describe, expect, it } from "vitest"

import { costItem, isBalanced, journeySteps, type JourneyInput, type JourneySchool } from "./journey"

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

describe("Know what you'll pay (step 3)", () => {
  it("counts priced schools until an offer is entered", () => {
    const it0 = costItem({ schools: [school(), school(), school()], offers: 0, priced: 2 })
    expect(it0).toMatchObject({ done: false, label: "2 of 3 schools priced" })
    expect(it0.links.map((l) => l.href)).toEqual(["/my-recruiting/colleges#cost", "/recruiting/learn/what-will-we-owe"])
  })
  it("is done once an offer is entered, and says how many are compared", () => {
    expect(costItem({ schools: [school()], offers: 1, priced: 1 })).toMatchObject({ done: true, label: "1 offer entered" })
    expect(costItem({ schools: [school(), school()], offers: 2, priced: 2 }).label).toBe("2 offers compared")
  })
  it("sits inside step 3 without changing its tick", () => {
    const steps = journeySteps({ firstName: "Sam", grade: "junior", schools: [school()], rulesSeen: false, allowedLine: null, upcomingEvents: 0, unreadMessages: 0, upcomingVisits: 0, visitsToConfirm: 0, offers: 1, priced: 1 })
    const rules = steps.find((s) => s.key === "rules")!
    expect(rules.items?.[0].done).toBe(true)
    expect(rules.status).not.toBe("done")
  })
})
