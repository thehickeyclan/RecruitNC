import { describe, expect, it } from "vitest"
import { duplicateBlockKeys, sameWrestler } from "./duplicate-athletes"

/**
 * Tennessee held two profiles for one Cleveland girl, class of 2028, because one source spelled
 * her "Carolline" and the other "Caroline". Her 2025 TSSAA title sat on one profile and her 2026
 * title on the other, so neither page showed a two-time state champion and the duplicate gate
 * reported zero. A doubled letter is the commonest single-source typo in these payloads.
 */
const hilton = (first: string) => ({
  name: `${first} Hilton`,
  highschool: "Cleveland",
  state: "TN",
  graduationyear: 2028,
  gender: "Female",
})

describe("a doubled letter is one source writing the name differently", () => {
  it("merges Carolline and Caroline Hilton, same school and class", () => {
    const v = sameWrestler(hilton("Carolline"), hilton("Caroline"))
    expect(v?.grade).toBe("certain")
    expect(v?.why).toMatch(/writes the name differently/)
  })

  it("is symmetric", () => {
    expect(sameWrestler(hilton("Caroline"), hilton("Carolline"))?.grade).toBe("certain")
  })

  it("catches a doubled letter in the surname too", () => {
    const a = { ...hilton("Caroline"), name: "Caroline Hilltton" }
    expect(sameWrestler(a, hilton("Caroline"))?.grade).toBe("certain")
  })

  it("still needs the school and class to agree", () => {
    const other = { ...hilton("Caroline"), highschool: "Science Hill" }
    // A near name at a DIFFERENT school is not merged and not even reviewed: the rule table has an
    // entry for an identical name across two schools ("a transfer, or two wrestlers") but none for
    // a near one, so this returns null. Conservative, and left as it is - widening it would put
    // every typo-plus-transfer pair into the review queue. Recorded here so the silence is known.
    expect(sameWrestler(hilton("Carolline"), other)).toBeNull()
    const olderClass = { ...hilton("Caroline"), graduationyear: 2027 }
    expect(sameWrestler(hilton("Carolline"), olderClass)).toBeNull()
  })

  it("does not merge a brother and a sister", () => {
    const brother = { ...hilton("Caroline"), gender: "Male" }
    expect(sameWrestler(hilton("Carolline"), brother)).toBeNull()
  })

  it("does not merge across states", () => {
    const nc = { ...hilton("Caroline"), state: "NC" }
    expect(sameWrestler(hilton("Carolline"), nc)).toBeNull()
  })

  it("leaves genuinely different wrestlers alone", () => {
    expect(sameWrestler(hilton("Carolline"), { ...hilton("Madison") })).toBeNull()
    expect(sameWrestler(hilton("Carolline"), { ...hilton("Charlotte") })).toBeNull()
  })

  it("the fold is not what agrees short forms - the prefix rule already did that", () => {
    // "Lee" and "Le" agree through the pre-existing three-letter prefix rule, not through the
    // fold, which needs four letters. Pinned so a later change to one is not read as the other.
    const lee = { ...hilton("Caroline"), name: "Lee Hilton" }
    const le = { ...hilton("Caroline"), name: "Le Hilton" }
    expect(sameWrestler(lee, le)?.grade).toBe("certain")
  })

  it("still blocks the pair together, or the rule would never be asked", () => {
    const a = duplicateBlockKeys(hilton("Carolline"))
    const b = duplicateBlockKeys(hilton("Caroline"))
    expect(a.some((k) => b.includes(k))).toBe(true)
  })
})
