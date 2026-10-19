import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/recruiting/scout/tools", () => ({ SCOUT_TOOLS: [], runScoutTool: vi.fn() }))

import { answerProblems, draftProblems } from "@/lib/recruiting/scout/run"

describe("draftProblems", () => {
  it("catches praise, roster talk and a questionnaire not done", () => {
    expect(draftProblems("I'm interested because of its strong wrestling program.", false)).toHaveLength(1)
    expect(draftProblems("I noticed there might be room at my weight class soon.", false)).toHaveLength(1)
    expect(draftProblems("the opportunity to fill a spot at my weight class, with one wrestler in their final year", false)).toHaveLength(1)
    expect(draftProblems("I have completed the recruiting questionnaire on your website.", true)).toHaveLength(1)
    expect(draftProblems("I have completed the recruiting questionnaire on your website.", false)).toHaveLength(0)
  })
  it("leaves a plain, factual email alone", () => {
    expect(draftProblems("Two wrestlers from my school, Topsail, wrestle for you, and Buies Creek is two hours from home.", true)).toEqual([])
  })
})

describe("collegesNamedIn", () => {
  it("finds the colleges a question names", async () => {
    const { collegesNamedIn } = await vi.importActual<typeof import("@/lib/recruiting/scout/tools")>("@/lib/recruiting/scout/tools")
    expect(collegesNamedIn("what gpa does mount olive require?")).toEqual(["university-of-mount-olive"])
    expect(collegesNamedIn("What GPA is needed for Roanoke college?")).toEqual(["roanoke-college"])
    expect(collegesNamedIn("Compare NC State and Campbell")).toEqual(expect.arrayContaining(["north-carolina-state-university-nc-state", "campbell-university"]))
    expect(collegesNamedIn("When can a coach call us?")).toEqual([])
    expect(collegesNamedIn("Which is the better campus, NC State or UNC?")).toEqual(expect.arrayContaining(["north-carolina-state-university-nc-state", "university-of-north-carolina-at-chapel-hill-north-carolina"]))
    expect(collegesNamedIn("How many wrestlers from North Carolina went D1?")).toEqual([])
    expect(collegesNamedIn("Is App State a good fit?")).toEqual(["appalachian-state-university"])
  })
})

describe("compareNiche", () => {
  it("decides each category in code", async () => {
    const { compareNiche } = await vi.importActual<typeof import("@/lib/recruiting/scout/tools")>("@/lib/recruiting/scout/tools")
    const text = compareNiche(["campbell-university", "appalachian-state-university"])!
    expect(text).toMatch(/Dorms: Campbell University B, Appalachian State University C\+: Campbell University is higher/)
  })
})

describe("answerProblems", () => {
  it("catches a college said to require the NCAA minimum, and grades read as verdicts", () => {
    expect(answerProblems("Mount Olive requires a 2.2 GPA to compete in Division II.")).toHaveLength(1)
    expect(answerProblems("The NCAA requires a 2.2 GPA in 16 core courses.")).toEqual([])
    expect(answerProblems("Mount Olive is safer than Campbell.")).toHaveLength(1)
    expect(answerProblems("Mount Olive has the higher safety grade: A+ to Campbell's B+.")).toEqual([])
    expect(answerProblems("Shane won't lose a year of eligibility if he takes a gap year.")).toHaveLength(1)
    expect(answerProblems("It depends on when his 19th birthday falls.")).toEqual([])
  })
})
