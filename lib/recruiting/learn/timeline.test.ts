import { describe, expect, it } from "vitest"

import { SOURCES, type D1Track } from "./content"
import { GRADES, TIMELINE, alwaysOpen, gradeForClass, gradeOfRule, openingsFor, unplacedRules } from "./timeline"

const TRACKS: D1Track[] = ["men-2028", "men-2027", "women"]

describe("the grade-by-grade timeline", () => {
  it("places every dated contact rule in a grade, or as open at any time", () => {
    for (const track of TRACKS) expect(unplacedRules(track), track).toEqual([])
  })

  it("puts the Division I dates where the rule's own words put them", () => {
    const when = (track: D1Track, grade: 10 | 11 | 12, what: RegExp) =>
      openingsFor(grade, track).find((o) => o.level === "Division I" && what.test(o.what))?.when
    expect(when("men-2028", 11, /call you/)).toBe("April 1 of junior year")
    expect(when("men-2028", 12, /Official/)).toBe("August 15 of senior year")
    expect(when("men-2027", 10, /call you/)).toBe("June 15 at the end of sophomore year")
    expect(when("women", 11, /Official/)).toBe("August 1 of junior year")
    // Nothing from Division I opens for a boy in the Class of 2028 or later before junior year.
    expect(openingsFor(10, "men-2028").filter((o) => o.level === "Division I")).toEqual([])
  })

  it("treats the two wordings of June 15 as the same summer", () => {
    expect(gradeOfRule("June 15 at the end of sophomore year")).toBe(10)
    expect(gradeOfRule("June 15 immediately before junior year")).toBe(10)
    expect(gradeOfRule("Any time")).toBe("any")
  })

  it("shows the levels with no waiting date as open now", () => {
    const levels = new Set(alwaysOpen("men-2028").map((o) => o.level))
    expect(levels.has("Division II")).toBe(true)
    expect(levels.has("Division III")).toBe(true)
  })

  it("covers eighth grade to senior year, each with sourced rules and a plan", () => {
    expect(TIMELINE.map((g) => g.grade)).toEqual(GRADES)
    for (const grade of TIMELINE) {
      expect(grade.steps.length, String(grade.grade)).toBeGreaterThan(2)
      for (const fact of grade.facts) {
        expect(fact.sources.length, fact.text).toBeGreaterThan(0)
        for (const key of fact.sources) expect(SOURCES[key], `${fact.text}: ${key}`).toBeDefined()
      }
    }
  })

  it("is about wrestling and no other sport", () => {
    const words = TIMELINE.flatMap((g) => [g.headline, ...g.facts.map((f) => f.text), ...g.steps.map((s) => s.text)]).join("\n")
    expect(words).not.toMatch(/\bsports?\b|football|basketball|baseball|soccer|lacrosse|volleyball|hockey/i)
  })

  it("knows which grade a class is in", () => {
    expect(gradeForClass(2027, 2027)).toBe(12)
    expect(gradeForClass(2029, 2027)).toBe(10)
    expect(gradeForClass(2031, 2027)).toBe(8)
    expect(gradeForClass(2026, 2027)).toBeNull()
    expect(gradeForClass(null, 2027)).toBeNull()
  })
})
