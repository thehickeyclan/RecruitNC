import { describe, expect, it } from "vitest"
import { commandCenterWelcomeEmail, welcomeSteps } from "@/lib/command-center-welcome"

const RW = "https://www.recruitwrestlers.com"
const ctx = (over: Partial<{ profileTodos: Array<{ todo: string; edit: string }>; grade: number | null; answeredPriorities: boolean }> = {}) => ({
  athleteId: "a1",
  profileTodos: [],
  grade: 11,
  answeredPriorities: true,
  ...over,
})

describe("Command Center welcome email steps", () => {
  it("starts with the profile when something is missing, opening the first missing editor", () => {
    const steps = welcomeSteps("recruitwrestlers", "Jax", ctx({ profileTodos: [{ todo: "Add highlight reel", edit: "highlight-video" }, { todo: "Verify contact information", edit: "contact" }] }))
    expect(steps.map((s) => s.key)).toEqual(["profile", "map", "forms"])
    expect(steps[0].href).toBe(`${RW}/athletes/a1?edit=highlight-video`)
    expect(steps[0].body).toContain("add highlight reel, verify contact information")
  })

  it("a complete profile in 10th grade or later: map, interest forms, Learn", () => {
    expect(welcomeSteps("recruitwrestlers", "Jax", ctx()).map((s) => s.key)).toEqual(["map", "forms", "learn"])
  })

  it("no interest forms before 10th grade", () => {
    expect(welcomeSteps("recruitwrestlers", "Jax", ctx({ grade: 9 })).map((s) => s.key)).toEqual(["map", "learn"])
    expect(welcomeSteps("recruitwrestlers", "Jax", ctx({ grade: 9, profileTodos: [{ todo: "Add a photo and your school", edit: "photo" }] })).map((s) => s.key)).toEqual(["profile", "map", "learn"])
  })

  it("starts with the What matters survey until the family has finished it", () => {
    const steps = welcomeSteps("recruitwrestlers", "Jax", ctx({ answeredPriorities: false, profileTodos: [{ todo: "Add highlight reel", edit: "highlight-video" }] }))
    expect(steps.map((s) => s.key)).toEqual(["priorities", "profile", "map"])
    expect(steps[0].href).toBe(`${RW}/my-recruiting/priorities`)
    expect(welcomeSteps("recruitwrestlers", "Jax", ctx({ answeredPriorities: false })).map((s) => s.key)).toEqual(["priorities", "map", "forms"])
  })

  it("never more than three", () => {
    expect(welcomeSteps("recruitwrestlers", "Jax", ctx({ profileTodos: [{ todo: "Add a photo and your school", edit: "photo" }] })).length).toBe(3)
  })
})

describe("Command Center welcome email", () => {
  it("names the parent and links every step", () => {
    const e = commandCenterWelcomeEmail({ brand: "recruitwrestlers", parentFirstName: "Haven", wrestlerFirstName: "Jax", context: ctx() })
    expect(e.html).toContain("Hi Haven,")
    for (const p of ["/recruiting/college-map", "/my-recruiting/questionnaires", "/my-recruiting/learn"]) expect(e.html).toContain(`${RW}${p}"`)
    expect(e.text).toContain("tell us how we are doing")
  })

  it("points to Learn at the bottom when it is not one of the steps", () => {
    const e = commandCenterWelcomeEmail({ brand: "recruitwrestlers", parentFirstName: null, wrestlerFirstName: "Jax", context: ctx({ profileTodos: [{ todo: "Add highlight reel", edit: "highlight-video" }] }) })
    expect(e.text).toContain("When you have time, Learn explains")
  })

  it("never says RecruitNC or NC United Wrestling", () => {
    const e = commandCenterWelcomeEmail({ brand: "ncunited", parentFirstName: null, wrestlerFirstName: null })
    expect(e.html).not.toMatch(/RecruitNC|NC United Wrestling/)
    expect(e.html).toContain("NC United")
    expect(e.html).toContain("your wrestler")
  })
})
