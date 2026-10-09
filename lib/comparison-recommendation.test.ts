import { describe, expect, it } from "vitest"
import { recommend, type RecommendationInput } from "./comparison-recommendation"
import type { FitCheck } from "./program-fit"

const base: RecommendationInput = {
  leftName: "Adam Walker",
  rightName: "Luke Richards",
  edges: { left: [], right: [] },
  headToHead: null,
  fit: null,
  bestWins: null,
  national: null,
}
const check = (key: FitCheck["key"], label: string, status: FitCheck["status"], mustHave = true): FitCheck => ({
  key, label, status, mustHave, detail: "",
})

describe("recommend", () => {
  it("lets a missed must-have settle it", () => {
    const r = recommend({
      ...base,
      edges: { left: ["Head to head", "Strength of opponents", "GPA"], right: ["NC state placement"] },
      headToHead: { edge: "left", lastEvent: "TOC", lastDate: "2026-09-18" },
      fit: { left: [check("class", "Class", "miss")], right: [check("class", "Class", "fit")] },
    })
    expect(r.pick).toBe("right")
    expect(r.headline).toBe("We'd lean Richards.")
    expect(r.reasons[0]).toBe("Meets all your must-haves; Walker misses Class.")
    expect(r.counterpoint).toBe("But Walker won their most recent meeting (TOC, 2026-09-18).")
  })

  it("goes with head to head when that wrestler is not behind on edges", () => {
    const r = recommend({
      ...base,
      edges: { left: ["Head to head", "NC state placement"], right: ["Strength of opponents", "National or NC only"] },
      headToHead: { edge: "left", lastEvent: "NC Super 32 Early Entry", lastDate: "2026-09-05" },
    })
    expect(r.pick).toBe("left")
    expect(r.reasons[0]).toBe("Won their most recent meeting (NC Super 32 Early Entry, 2026-09-05).")
    expect(r.counterpoint).toBe("Richards leads on Strength of opponents and National or NC only.")
  })

  it("does not let head to head outvote a clear edge lead", () => {
    const r = recommend({
      ...base,
      edges: { left: ["Head to head"], right: ["Strength of opponents", "National or NC only", "GPA"] },
      headToHead: { edge: "left", lastEvent: "TOC", lastDate: null },
    })
    expect(r.pick).toBe("right")
    expect(r.counterpoint).toBe("But Walker won their most recent meeting (TOC).")
  })

  it("calls it close rather than inventing a winner", () => {
    const r = recommend({ ...base, edges: { left: ["GPA"], right: ["SAT"] } })
    expect(r.pick).toBeNull()
    expect(r.headline).toBe("Too close to call.")
    expect(r.reasons[0]).toBe("Walker leads on GPA; Richards on SAT.")
  })

  it("says so when nothing separates them", () => {
    expect(recommend(base).reasons[0]).toBe("Nothing on the rows you count separates them.")
  })

  it("flags when neither meets the must-haves", () => {
    const r = recommend({
      ...base,
      edges: { left: ["Strength of opponents", "GPA", "SAT"], right: [] },
      fit: { left: [check("state", "State finish", "miss")], right: [check("class", "Class", "miss")] },
    })
    expect(r.pick).toBe("left")
    expect(r.reasons[0]).toBe("Neither wrestler meets all your must-haves.")
  })
})
