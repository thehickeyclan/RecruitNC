import { describe, expect, it } from "vitest"
import { applyClassPositionFloor, applyStarOverride, classPositionFloor, type StarRating } from "./athlete-star-rating"

const rating = (stars: number): StarRating => ({ stars, score: 10, components: [], provisional: false })

describe("class-position floor", () => {
  it("top 10 at least four, 11-45 three, 46-75 two, past 75 nothing", () => {
    expect([1, 10, 11, 45, 46, 75, 76, null].map(classPositionFloor)).toEqual([4, 4, 3, 3, 2, 2, 1, 1])
  })

  it("raises a lower star and says why", () => {
    const r = applyClassPositionFloor(rating(1), 3)
    expect(r.stars).toBe(3)
    expect(r.floor).toBe("3 stars: in the formula's top 45 of the class")
  })

  it("never lowers a star and never touches a five", () => {
    expect(applyClassPositionFloor(rating(4), 2).stars).toBe(4)
    expect(applyClassPositionFloor(rating(5), 4).stars).toBe(5)
  })

  it("a star set by hand wins over the floor", () => {
    expect(applyClassPositionFloor(applyStarOverride(rating(2), { stars: 2, reason: "x" }), 4).stars).toBe(2)
    expect(applyStarOverride(applyClassPositionFloor(rating(1), 4), { stars: 2, reason: "x" }).stars).toBe(2)
  })
})
