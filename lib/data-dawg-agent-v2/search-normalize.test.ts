import { describe, expect, it } from "vitest"
import { extractAthleteLookupPhrase } from "./athlete-name-fast-path-detect"

/*
 * "What do we have on <name>" is the way the question actually gets asked, and it was the one
 * phrasing that did not work: it resolved to "we have nick meza", matched nobody, and the answer
 * was that we held no records on the reigning Arizona champion.
 */
describe("extractAthleteLookupPhrase", () => {
  const CASES: Array<[string, string]> = [
    ["what do we have on Nick Meza", "nick meza"],
    ["what do we have on Dustin Kohn", "dustin kohn"],
    ["do we have anything on Landon Lee", "landon lee"],
    ["what have we got on Micah Engelman", "micah engelman"],
    ["what do we know about Reef Dillard", "reef dillard"],
    ["anything on Brianna Palmer", "brianna palmer"],
    ["tell me about Nick Meza", "nick meza"],
    ["who is Nick Meza", "nick meza"],
    ["Nick Meza", "nick meza"],
  ]
  for (const [message, expected] of CASES) {
    it(`"${message}" -> "${expected}"`, () => {
      expect(extractAthleteLookupPhrase(message)).toBe(expected)
    })
  }

  it("keeps a name that happens to contain a stripped word", () => {
    // "Hold" and "Means" are surnames; the stopword list must not eat the name itself.
    expect(extractAthleteLookupPhrase("what do we have on Jake Means")).toBe("jake means")
  })
})
