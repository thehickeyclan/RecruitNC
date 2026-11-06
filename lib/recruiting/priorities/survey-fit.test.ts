import { describe, expect, it } from "vitest"

import { surveyFitFor, type CollegeFacts } from "@/lib/recruiting/priorities/recommend"
import type { Respondent, SharingClass } from "@/lib/recruiting/priorities/questions"
import { jointInputs, ownerOnlyInputs, type Answer, type FamilySets } from "@/lib/recruiting/priorities/sharing"

const college = (over: Partial<CollegeFacts> = {}): CollegeFacts => ({
  id: "x",
  name: "X",
  level: "D2",
  state: "NC",
  place: "Somewhere, NC",
  latitude: 35.77,
  longitude: -78.64,
  inState: true,
  athletic: "fit",
  academic: "unknown",
  majors: ["52"],
  undergrads: 3_200,
  setting: "Town: Fringe",
  openWeights: [],
  rosterSeason: "2026-27",
  sticker: 30_000,
  averageNet: 18_000,
  calculator: null,
  serviceAcademy: false,
  coachViews: 0,
  coachNeedWeight: null,
  firstSeason: null,
  ...over,
})

const a = (key: string, value: unknown, sharing: SharingClass = "shared", marker: Answer["marker"] = null): Answer => ({ key, value, sharing, marker })
const set = (respondent: Respondent, answers: Answer[]) => ({ id: `${respondent}-1`, respondent, version: 1, completedAt: "2026-11-05", answers })
const lines = (viewer: Respondent, sets: FamilySets, c = college()) =>
  surveyFitFor({ viewer, joint: jointInputs(sets), own: ownerOnlyInputs(viewer, sets), centre: [35.5, -79.5], zipPoint: (z) => (z === "27601" ? [35.77, -78.64] : null) }, c)
const byKey = (l: ReturnType<typeof lines>) => Object.fromEntries(l.map((x) => [x.key, x]))

const PARENT = [
  a("divisions", { D1: "interested", D2: "open", D3: "not" }),
  a("distance", "5h"),
  a("home_zip", "27601", "private"),
  a("academics", { majors: ["52"] }),
  a("school_feel", ["small", "town"]),
  a("budget", "10_20", "constraint"),
]

describe("surveyFitFor: one college against the family's answers", () => {
  it("a line per answered question, in order, each saying what it compared", () => {
    const l = lines("parent", { parent: set("parent", PARENT), athlete: null })
    expect(l.map((x) => x.key)).toEqual(["level", "distance", "major", "feel", "cost"])
    const k = byKey(l)
    expect(k.level).toMatchObject({ status: "fit", text: "Division II: a level you're open to." })
    expect(k.distance.status).toBe("fit")
    expect(k.distance.text).toBe("Under 10 miles from home, within about 5 hours.")
    expect(k.major).toMatchObject({ status: "fit", text: "Offers Business." })
    expect(k.feel).toMatchObject({ status: "fit", text: "A small school (3,200 undergrads) in a college town. What you said feels right." })
    expect(k.cost).toMatchObject({ status: "fit", text: "About $18k a year (on average after aid), within your budget." })
  })

  it("misses read as a stretch, and a must-have miss as a concern", () => {
    const far = college({ latitude: 40.8, longitude: -77.9, level: "D3", majors: ["14"], undergrads: 30_000, setting: "City: Large", averageNet: 40_000 })
    const k = byKey(lines("parent", { parent: set("parent", PARENT), athlete: null }, far))
    expect(k.level).toMatchObject({ status: "concern" })
    expect(k.distance).toMatchObject({ status: "stretch" })
    expect(k.distance.text).toContain("farther than about 5 hours")
    expect(k.major).toMatchObject({ status: "stretch", text: "Doesn't list Business." })
    expect(k.feel.text).toContain("Not what you described.")
    expect(k.cost.status).toBe("stretch")
    expect(k.cost.text).toContain("net price calculator")

    const must = PARENT.map((x) => (x.key === "distance" || x.key === "academics" ? { ...x, marker: "must" as const } : x))
    const m = byKey(lines("parent", { parent: set("parent", must), athlete: null }, far))
    expect(m.distance.status).toBe("concern")
    expect(m.major.status).toBe("concern")
  })

  it("no data is 'Not enough to say', never a guess; an unanswered question has no line", () => {
    const k = byKey(lines("parent", { parent: set("parent", PARENT), athlete: null }, college({ majors: null, undergrads: null, setting: null, averageNet: null, sticker: null })))
    expect(k.major.status).toBe("unknown")
    expect(k.feel.status).toBe("unknown")
    expect(k.cost.status).toBe("unknown")
    expect(lines("parent", { parent: set("parent", [a("distance", "anywhere")]), athlete: null }).map((x) => x.key)).toEqual(["distance"])
  })

  it("the parent's private budget and home ZIP never reach the wrestler's view", () => {
    const k = byKey(lines("athlete", { parent: set("parent", PARENT), athlete: set("athlete", [a("divisions", { D2: "interested" })]) }))
    expect(k.cost).toBeUndefined()
    expect(k.distance.text).toContain("from the middle of your state")
  })

  it("one side's no against the other's interest reads as worth a look, not a no", () => {
    const k = byKey(lines("parent", { parent: set("parent", [a("divisions", { D2: "not" })]), athlete: set("athlete", [a("divisions", { D2: "interested" })]) }))
    expect(k.level).toMatchObject({ status: "stretch", text: "Division II: one of you isn't interested in this level." })
  })
})
