import { describe, expect, it } from "vitest"
import { CONFIDENT_THRESHOLD, didYouMeanLine, findSimilarNames, nameSimilarity } from "./athlete-fuzzy-search"

/** Real names from the directory, including the ones users failed to find. */
const ROSTER = [
  "Deion Marshall", "Heaven Fitch", "Elijah Dorsey", "Gunner Marshall", "Blaze Marshall",
  "Will Fincher", "Carson Worrick", "Tobin McNair", "Jacob McCord", "Xavier Bernthal",
  "Liam Myles", "Adam Walker", "Josh Stonebraker", "Vincent Grack", "Aiden Burkholder",
]
const find = (q: string) => findSimilarNames(q, ROSTER, (n) => n)

describe("the searches that came back empty", () => {
  it("finds Deion Marshall from 'Deion marshals'", () => {
    /** Logged 4 September: two state placements on file, and the user was told he did not exist. */
    expect(find("Deion marshals")[0]?.name).toBe("Deion Marshall")
  })

  it("finds Heaven Fitch from 'Heaven Finch'", () => {
    /** Three state titles. One wrong letter cost the answer. */
    expect(find("Heaven Finch")[0]?.name).toBe("Heaven Fitch")
  })

  it("finds a name typed without its capital or apostrophe", () => {
    expect(find("josh stonebraker")[0]?.name).toBe("Josh Stonebraker")
  })

  it("survives a doubled letter", () => {
    expect(find("Liam Mylles")[0]?.name).toBe("Liam Myles")
  })

  it("survives a transposition", () => {
    expect(find("Vincnet Grack")[0]?.name).toBe("Vincent Grack")
  })
})

describe("what it must not do", () => {
  it("invents nobody when the wrestler genuinely is not there", () => {
    /** Anderson Kanupp is in no table. A confident wrong answer is worse than none. */
    expect(find("Anderson Kanupp")).toEqual([])
  })

  it("does not match on a shared first name alone", () => {
    /** Three Marshalls on the roster; "Deion" must not drag in Gunner or Blaze at the top. */
    const hits = find("Deion Marshall")
    expect(hits[0].name).toBe("Deion Marshall")
  })

  it("ignores a query too short to mean anything", () => {
    expect(find("Jo")).toEqual([])
  })

  it("rates an exact name above the confident line", () => {
    expect(nameSimilarity("Heaven Fitch", "Heaven Fitch")).toBeGreaterThanOrEqual(CONFIDENT_THRESHOLD)
  })

  it("rates two different people below it", () => {
    expect(nameSimilarity("Adam Walker", "Liam Myles")).toBeLessThan(CONFIDENT_THRESHOLD)
  })
})

describe("what the user is asked", () => {
  it("names one suggestion plainly", () => {
    expect(didYouMeanLine(["Heaven Fitch"])).toBe("Did you mean **Heaven Fitch**?")
  })

  it("reads as a sentence with several", () => {
    expect(didYouMeanLine(["Gunner Marshall", "Blaze Marshall", "Deion Marshall"])).toBe(
      "Did you mean **Gunner Marshall**, **Blaze Marshall** or **Deion Marshall**?",
    )
  })

  it("says nothing when there is nothing to suggest", () => {
    expect(didYouMeanLine([])).toBe("")
  })
})
