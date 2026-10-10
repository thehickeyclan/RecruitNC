import { describe, expect, it } from "vitest"
import { appendWebBackground, frameWebAnswer } from "./data-dawg-web-search"

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

describe("appendWebBackground", () => {
  it("puts the web under our answer, labelled, with sources", () => {
    const out = appendWebBackground("Clark is the 2026 Virginia 5A champion at 106.", {
      summary: "- Great Bridge High School, Chesapeake\n- Class of 2029",
      sources: ["https://a.example/x"],
    })
    expect(out.startsWith("Clark is the 2026 Virginia 5A champion")).toBe(true)
    expect(out.indexOf("not verified by RecruitNC")).toBeGreaterThan(out.indexOf("champion at 106"))
    expect(out).toContain("where the two differ, trust those")
    expect(out).toContain("- https://a.example/x")
  })

  it("leaves our answer alone when the search found nothing or cannot be checked", () => {
    expect(appendWebBackground("Ours.", null)).toBe("Ours.")
    expect(appendWebBackground("Ours.", { summary: "Something", sources: [] })).toBe("Ours.")
  })
})
