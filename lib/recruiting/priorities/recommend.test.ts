import { describe, expect, it } from "vitest"

import { placementFor, recommend, weightsFor, type CollegeFacts, type Lists, type RecommendInput } from "@/lib/recruiting/priorities/recommend"
import type { Respondent, SharingClass } from "@/lib/recruiting/priorities/questions"
import { jointInputs, ownerOnlyInputs, type Answer, type FamilySets } from "@/lib/recruiting/priorities/sharing"

const college = (over: Partial<CollegeFacts> & { id: string }): CollegeFacts => ({
  name: over.id,
  level: "D2",
  state: "NC",
  place: "Somewhere, NC",
  latitude: 35.5,
  longitude: -79.5,
  inState: true,
  athletic: "fit",
  academic: "unknown",
  majors: null,
  undergrads: null,
  setting: null,
  openWeights: [],
  rosterSeason: "2026-27",
  sticker: 30_000,
  averageNet: null,
  calculator: "https://example.edu/npc",
  serviceAcademy: false,
  coachViews: 0,
  coachNeedWeight: null,
  firstSeason: null,
  ...over,
})

const COLLEGES: CollegeFacts[] = [
  college({ id: "d1-near", level: "D1", athletic: "stretch", openWeights: [165], coachViews: 2 }),
  college({ id: "d1-far", level: "D1", state: "PA", inState: false, latitude: 40.8, longitude: -77.9, athletic: "fit", sticker: 60_000 }),
  college({ id: "d2-a", level: "D2", academic: "fit", sticker: 18_000 }),
  college({ id: "d2-b", level: "D2", openWeights: [157] }),
  college({ id: "d2-c", level: "D2" }),
  college({ id: "d3-a", level: "D3", majors: ["52"], undergrads: 2_000 }),
  college({ id: "d3-b", level: "D3", majors: ["14"], undergrads: 20_000 }),
  college({ id: "naia", level: "NAIA", athletic: "concern", coachNeedWeight: 165 }),
  college({ id: "njcaa", level: "NJCAA", athletic: "unknown", inState: false, state: "VA" }),
  college({ id: "army", level: "D1", academic: "fit", serviceAcademy: true, inState: false, state: "NY", latitude: 41.4, longitude: -74 }),
]

const a = (key: string, value: unknown, sharing: SharingClass = "shared", marker: Answer["marker"] = null): Answer => ({ key, value, sharing, marker })
const set = (respondent: Respondent, answers: Answer[]) => ({ id: `${respondent}-1`, respondent, version: 1, completedAt: "2026-11-05", answers })

function run(viewer: Respondent, sets: FamilySets, colleges = COLLEGES, passed?: Set<string>): Lists {
  const input: RecommendInput = {
    viewer,
    joint: jointInputs(sets),
    own: ownerOnlyInputs(viewer, sets),
    colleges,
    weights: { near: [165, 157], up: 174 },
    arrivalFall: 2028,
    firstName: "Gavin",
    homeState: "NC",
    centre: [35.5, -79.5],
    zipPoint: (z) => (z === "27601" ? [35.77, -78.64] : null),
    passed,
  }
  return recommend(input)
}

const ids = (l: Lists) => ({ best: l.bestFit.map((c) => c.id), opp: l.opportunities.map((c) => c.id) })

const PARENT_SHARED = [a("distance", "anywhere"), a("top3", ["cost", "academics", "distance"]), a("divisions", { D1: "interested", D2: "interested" })]
const ATHLETE_SHARED = [a("distance", "dont_care"), a("top3", ["level", "compete_early", "coaching"]), a("divisions", { D1: "interested" })]

describe("inference leak: the athlete's lists never move with the parent's non-Shared answers", () => {
  const variants: Answer[][] = [
    [],
    [a("budget", "lt10", "constraint"), a("budget_kind", "limit", "constraint")],
    [a("budget", "50plus", "constraint"), a("budget_kind", "target", "constraint")],
    [a("benefits", ["gi_bill"], "private"), a("home_zip", "27601", "private"), a("dealbreaker", "No big cities", "private")],
    // The parent's grid made private: it shapes the parent's view only.
    [a("divisions", { D1: "not", D2: "not", D3: "not" }, "private")],
  ]
  it("is identical for every private variant", () => {
    const outs = variants.map((extra) => {
      // Only non-Shared answers vary: the Shared ones are the same in every variant.
      const parentAnswers = [...PARENT_SHARED.filter((x) => x.key !== "divisions"), ...extra]
      return run("athlete", { parent: set("parent", parentAnswers), athlete: set("athlete", ATHLETE_SHARED) })
    })
    for (const o of outs.slice(1)) expect(o).toEqual(outs[0])
  })
  it("but the parent's own view does use them", () => {
    const plain = run("parent", { parent: set("parent", PARENT_SHARED), athlete: set("athlete", ATHLETE_SHARED) })
    const limited = run("parent", { parent: set("parent", [...PARENT_SHARED, a("budget", "lt10", "constraint"), a("budget_kind", "limit", "constraint")]), athlete: set("athlete", ATHLETE_SHARED) })
    expect(limited).not.toEqual(plain)
  })
})

describe("divisions: nobody holds a veto", () => {
  it("one 'not' against the other's interest sends the level to Opportunities only", () => {
    const sets: FamilySets = { parent: set("parent", [a("divisions", { D1: "not" })]), athlete: set("athlete", [a("divisions", { D1: "interested" })]) }
    for (const viewer of ["parent", "athlete"] as const) {
      const out = run(viewer, sets)
      expect(out.bestFit.some((c) => c.level === "D1")).toBe(false)
      expect(out.opportunities.map((c) => c.id)).toContain("d1-near")
      expect(out.opportunities.find((c) => c.id === "d1-near")!.mightNot.join(" ")).toMatch(/isn't interested in D1/)
    }
  })
  it("both saying 'not' leaves the level out of both lists", () => {
    const sets: FamilySets = { parent: set("parent", [a("divisions", { D1: "not" })]), athlete: set("athlete", [a("divisions", { D1: "not" })]) }
    const out = run("parent", sets)
    expect([...out.bestFit, ...out.opportunities].some((c) => c.level === "D1")).toBe(false)
  })
  it("before the other side answers, a grid governs only its owner's view", () => {
    const g = { parent: { D1: "not" as const }, athlete: null }
    expect(placementFor("parent", g, "D1")).toBe("excluded")
    expect(placementFor("athlete", g, "D1")).toBe("primary")
  })
})

describe("earned, never padded", () => {
  it("at most five per list and two per level, and no college in both", () => {
    const many = Array.from({ length: 20 }, (_, i) => college({ id: `d2-${i}`, level: "D2", openWeights: [165] }))
    const out = run("parent", { parent: set("parent", PARENT_SHARED), athlete: null }, many)
    expect(out.bestFit.length).toBeLessThanOrEqual(5)
    expect(out.bestFit.filter((c) => c.level === "D2").length).toBeLessThanOrEqual(2)
    const { best, opp } = ids(out)
    expect(best.filter((id) => opp.includes(id))).toEqual([])
  })
  it("a college with nothing to back it up is left out", () => {
    const out = run("parent", { parent: set("parent", []), athlete: null }, [college({ id: "blank", inState: false, athletic: "unknown" })])
    expect(out.bestFit).toEqual([])
    expect(out.opportunities).toEqual([])
  })
  it("Opportunities need evidence: an opening, a coach need or coach views", () => {
    const out = run("athlete", { parent: null, athlete: set("athlete", ATHLETE_SHARED) })
    for (const c of out.opportunities) expect(c.why.join(" ")).toMatch(/Projected opportunity|posted a need|viewed/)
  })
  it("results below the level keep a college out of Best fit, never out of Opportunities", () => {
    const out = run("parent", { parent: set("parent", []), athlete: null })
    expect(ids(out).best).not.toContain("naia")
    expect(ids(out).opp).toContain("naia")
  })
})

describe("must-haves and the service academies", () => {
  it("a must-have distance is a hard cap", () => {
    const out = run("parent", { parent: set("parent", [a("distance", "2h", "shared", "must")]), athlete: null })
    expect([...out.bestFit, ...out.opportunities].map((c) => c.id)).not.toContain("d1-far")
  })
  it("a strong (not must) distance only weighs and says so", () => {
    const out = run("parent", { parent: set("parent", [a("distance", "2h", "shared", "strong"), a("top3", ["level"])]), athlete: null })
    const far = [...out.bestFit, ...out.opportunities].find((c) => c.id === "d1-far")
    if (far) expect(far.mightNot.join(" ")).toMatch(/Farther than about 2 hours/)
  })
  it("a must-have major filters only where we know the school's majors", () => {
    const out = run("parent", { parent: set("parent", [a("academics", { majors: ["52"], text: null, undecided: false }, "shared", "must")]), athlete: null })
    const all = [...out.bestFit, ...out.opportunities].map((c) => c.id)
    expect(all).not.toContain("d3-b")
    expect(all).toContain("d3-a")
  })
  it("'Not for me' on a service academy takes the academies out", () => {
    const with_ = run("athlete", { parent: null, athlete: set("athlete", [a("service", "interested"), a("top3", ["level"])]) })
    const without = run("athlete", { parent: null, athlete: set("athlete", [a("service", "not"), a("top3", ["level"])]) })
    expect([...without.bestFit, ...without.opportunities].map((c) => c.id)).not.toContain("army")
    expect(with_.bestFit.map((c) => c.id)).toContain("army")
  })
})

describe("markers", () => {
  it("strong distance outranks a farther college that scores the same otherwise", () => {
    const near = college({ id: "near", openWeights: [165], inState: false })
    const far = college({ id: "far", openWeights: [165], inState: false, latitude: 40.8, longitude: -77.9, academic: "fit" })
    const flexible = run("parent", { parent: set("parent", [a("distance", "2h", "shared", "flexible")]), athlete: null }, [near, far])
    const strong = run("parent", { parent: set("parent", [a("distance", "2h", "shared", "strong")]), athlete: null }, [near, far])
    const first = (l: Lists) => [...l.bestFit, ...l.opportunities][0].id
    expect(first(flexible)).toBe("far")
    expect(first(strong)).toBe("near")
  })
})

describe("cost is a flag, never a filter", () => {
  const sets = (kind: "limit" | "target"): FamilySets => ({ parent: set("parent", [a("budget", "lt10", "constraint"), a("budget_kind", kind, "constraint"), a("top3", ["level"])]), athlete: null })
  it("above a limit: the college stays, flagged, and the next step is the calculator", () => {
    const out = run("parent", sets("limit"))
    const card = [...out.bestFit, ...out.opportunities].find((c) => c.id === "d1-near")!
    expect(card).toBeTruthy()
    expect(card.mightNot.join(" ")).toMatch(/^Affordability unverified: \$\d+k sticker price, above your limit/)
    expect(card.next.href).toBe("https://example.edu/npc")
  })
  it("a target only weighs: no flag", () => {
    const out = run("parent", sets("target"))
    for (const c of [...out.bestFit, ...out.opportunities]) expect(c.mightNot.join(" ")).not.toMatch(/Affordability/)
  })
  it("the benefits note shows in the parent's view only", () => {
    const s: FamilySets = { parent: set("parent", [a("benefits", ["gi_bill"], "private")]), athlete: set("athlete", []) }
    expect(run("parent", s).notes.join(" ")).toMatch(/benefits you marked/)
    expect(run("athlete", s).notes.join(" ")).not.toMatch(/benefits/)
  })
})

describe("weights and copy", () => {
  it("each side's Top 3 adds 3, 2, 1, averaged", () => {
    const w = weightsFor({ parent: [a("top3", ["cost", "distance", "level"])], athlete: [a("top3", ["level", "compete_early", "campus"])] })
    expect(w.cost).toBeCloseTo(2.5)
    expect(w.level).toBeCloseTo(1 + 0.5 + 1.5)
  })
  it("cards never say room or spot, and ask no questions", () => {
    const out = run("parent", { parent: set("parent", [...PARENT_SHARED, a("budget", "lt10", "constraint"), a("budget_kind", "limit", "constraint"), a("benefits", ["gi_bill"], "private")]), athlete: set("athlete", ATHLETE_SHARED) })
    const text = JSON.stringify([out.notes, ...[...out.bestFit, ...out.opportunities].map((c) => [c.why, c.mightNot, c.next.label, c.opportunityNote])])
    expect(text).not.toMatch(/\broom\b|\bspot\b/i)
    expect(text).not.toContain("?")
  })
  it("a projected opportunity carries the season and the caveat", () => {
    const out = run("athlete", { parent: null, athlete: set("athlete", ATHLETE_SHARED) })
    const card = [...out.bestFit, ...out.opportunities].find((c) => c.id === "d1-near")!
    expect(card.why[0]).toBe("Projected opportunity at 165 in fall 2028")
    expect(card.opportunityNote).toBe("From the 2026-27 roster. Transfers and new recruits can change this.")
  })
  it("one class up reads the weight above", () => {
    const out = run("athlete", { parent: null, athlete: set("athlete", [a("college_weight", "one_up")]) }, [college({ id: "x", openWeights: [174] }), college({ id: "y", openWeights: [165] })])
    const all = [...out.bestFit, ...out.opportunities]
    expect(all.find((c) => c.id === "x")!.why[0]).toBe("Projected opportunity at 174 in fall 2028")
    expect(all.find((c) => c.id === "y")?.why.join(" ") ?? "").not.toMatch(/Projected opportunity/)
  })
})

describe("reactions shape only the reactor's own next lists", () => {
  const sets: FamilySets = { parent: set("parent", PARENT_SHARED), athlete: set("athlete", ATHLETE_SHARED) }
  it("a college the viewer passed is never re-offered to them", () => {
    const before = ids(run("athlete", sets))
    const first = before.best[0] ?? before.opp[0]
    expect(first).toBeTruthy()
    const after = ids(run("athlete", sets, COLLEGES, new Set([first!])))
    expect([...after.best, ...after.opp]).not.toContain(first)
  })
  it("the other side's view is untouched by this viewer's passes (the engine never reads them)", () => {
    const parent = ids(run("parent", sets))
    const first = parent.best[0] ?? parent.opp[0]
    expect(ids(run("parent", sets))).toEqual(parent)
    expect([...ids(run("parent", sets)).best, ...ids(run("parent", sets)).opp]).toContain(first)
  })
})
