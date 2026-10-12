import { describe, expect, it } from "vitest"
import { answerCoachViewsQuestion, isCoachViewsQuestion } from "./data-dawg-coach-views-answer"

describe("isCoachViewsQuestion", () => {
  it.each([
    "Where do I see what coaches are looking at my account",
    "which colleges viewed my profile?",
    "who has looked at my son's profile",
    "Can I see what schools are watching me",
    "how do i know if any coach has seen my page",
    "what programs visited my profile",
  ])("catches %s", (q) => expect(isCoachViewsQuestion(q)).toBe(true))

  it.each([
    "Who is the head coach at NC State?",
    "What colleges have wrestling in North Carolina",
    "Show me Kevin O'Brien's results",
    "who did my son lose to at states",
    "When is the next Blue practice",
    "What coaches are at App State",
  ])("leaves %s alone", (q) => expect(isCoachViewsQuestion(q)).toBe(false))
})

describe("answerCoachViewsQuestion", () => {
  it("names the place, the price and the way to subscribe", () => {
    const a = answerCoachViewsQuestion()
    expect(a).toContain("College coach views")
    expect(a).toContain("$9.99 a month")
    expect(a).toContain("(/rankings?plan=subscription)")
  })
})
