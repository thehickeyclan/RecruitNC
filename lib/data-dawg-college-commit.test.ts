import { describe, expect, it } from "vitest"
import { getAthleteNameSearchVariants } from "@/lib/athlete-name-match"

describe("data-dawg college commit name coverage", () => {
  it("includes Eli/Elijah variants so commit lookup can match either spelling", () => {
    const fromElijah = getAthleteNameSearchVariants("Elijah Horton")
    const fromEli = getAthleteNameSearchVariants("Eli Horton")
    expect(fromElijah.some((v) => /eli/i.test(v) && /horton/i.test(v))).toBe(true)
    expect(fromEli.some((v) => /elijah/i.test(v) && /horton/i.test(v))).toBe(true)
  })
})
