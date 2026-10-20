import { describe, expect, it } from "vitest"

import { athleticAdmissionFacts, projectedLevelFacts } from "./projected-level"

const rating = (stars: number) => ({ stars, score: 60, components: [], provisional: false })

describe("projected college level", () => {
  it("says Matt's level for each star, and what would raise it", () => {
    expect(projectedLevelFacts("Shane", rating(5), { female: false })).toMatch(/Division I, Tier 1\..*top of our scale/)
    expect(projectedLevelFacts("Shane", rating(4), { female: false })).toMatch(/Division I Tier 2, and the top Division II and Division III programs/)
    expect(projectedLevelFacts("Shane", rating(3), { female: false })).toMatch(/Division II and the top Division III programs\. What would raise it: a winning record at Super 32/)
    expect(projectedLevelFacts("Shane", rating(2), { female: false })).toMatch(/Division III, NAIA and junior college/)
  })

  it("never guesses for an unrated wrestler", () => {
    expect(projectedLevelFacts("Gavin", null, { female: false })).toMatch(/too early/)
    expect(projectedLevelFacts("Ava", null, { female: true })).toMatch(/does not project a college level for women's wrestling yet/)
  })

  it("athletic admission: UNC and NC State carry the 3.0 guidance, others the general rule", () => {
    expect(athleticAdmissionFacts("university-of-north-carolina-at-chapel-hill-north-carolina", "UNC")).toMatch(/at UNC, recruited athletes are admitted with a 3\.0 GPA or higher/)
    expect(athleticAdmissionFacts("north-carolina-state-university-nc-state", "NC State")).toMatch(/3\.0 GPA or higher/)
    expect(athleticAdmissionFacts("campbell-university", "Campbell")).not.toMatch(/3\.0/)
  })
})
