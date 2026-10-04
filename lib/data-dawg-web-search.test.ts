import { describe, expect, it } from "vitest"
import { frameWebAnswer } from "./data-dawg-web-search"

describe("frameWebAnswer", () => {
  it("says the data is not ours before the answer, and lists the sources after", () => {
    // Applied in code: whether a reader can tell ours from the web is not the model's to decide.
    const out = frameWebAnswer("Marcus Blaze wrestles for Perrysburg.", ["https://a.example/x", "https://b.example/y"])
    expect(out.startsWith("**Not in RecruitNC data")).toBe(true)
    expect(out).toContain("not used in rankings or scouting reports")
    expect(out).toContain("Marcus Blaze wrestles for Perrysburg.")
    expect(out.indexOf("**Sources**")).toBeGreaterThan(out.indexOf("Perrysburg"))
    expect(out).toContain("- https://a.example/x")
  })

  it("still flags an answer that arrived without sources", () => {
    const out = frameWebAnswer("Something.", [])
    expect(out).toContain("Not in RecruitNC data")
    expect(out).not.toContain("**Sources**")
  })
})
