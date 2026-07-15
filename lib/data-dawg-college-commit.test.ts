import { describe, expect, it } from "vitest"
import { getAthleteNameSearchVariants } from "@/lib/athlete-name-match"
import {
  formatCommitChronologyLine,
  formatCommitNarrativeClause,
  formatCommitTimelineLabel,
} from "./data-dawg-college-commit"

describe("data-dawg college commit name coverage", () => {
  it("includes Eli/Elijah variants so commit lookup can match either spelling", () => {
    const fromElijah = getAthleteNameSearchVariants("Elijah Horton")
    const fromEli = getAthleteNameSearchVariants("Eli Horton")
    expect(fromElijah.some((v) => /eli/i.test(v) && /horton/i.test(v))).toBe(true)
    expect(fromEli.some((v) => /elijah/i.test(v) && /horton/i.test(v))).toBe(true)
  })
})

describe("commit transfer chronology", () => {
  it("lists college career path UNC → NC State", () => {
    expect(formatCommitChronologyLine("NC State", "UNC Chapel Hill")).toBe(
      "College career: UNC Chapel Hill → NC State",
    )

    expect(formatCommitNarrativeClause("NC State", "UNC Chapel Hill")).toBe(
      "continued his career collegiately at UNC Chapel Hill and then NC State",
    )

    expect(formatCommitTimelineLabel("NC State", "UNC Chapel Hill")).toBe(
      "🎓 UNC Chapel Hill → NC State",
    )
  })

  it("keeps simple college line when there is no transfer", () => {
    expect(formatCommitChronologyLine("Appalachian State", null, "D1")).toBe(
      "College: Appalachian State (D1)",
    )
  })
})
