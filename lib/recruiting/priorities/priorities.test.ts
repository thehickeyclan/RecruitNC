import { describe, expect, it } from "vitest"

import { budgetBand, cleanAnswer, distanceFromMiles, prefillFor, withSiblingPrefill } from "./answers"
import { QUESTIONS, defaultSharing, questionsFor, sharingLine, showA9, wantsBsnFollowUp } from "./questions"
import { jointInputs, jointPlacement, ownPlacement, ownerOnlyInputs, reactionSeenBy, reactionSharing, viewFor, type Answer, type AnswerSet, type FamilySets } from "./sharing"

const set = (respondent: "parent" | "athlete", answers: Answer[]): AnswerSet => ({ id: respondent, respondent, version: 1, completedAt: "2026-11-05", answers })
const a = (key: string, value: unknown, sharing: Answer["sharing"] = "shared"): Answer => ({ key, value, sharing, marker: null, notSure: false })

describe("question inventory (authoritative numbering)", () => {
  it("parent: goals first, then P1–P8 without the retired P4", () => {
    expect(QUESTIONS.filter((q) => q.respondent === "parent").map((q) => q.id)).toEqual(["P0", "P0b", "P1", "P2", "P3", "P5", "P6", "P7", "P8"])
  })
  it("athlete: goals first, A1–A8 without A3, A4b, conditional A9: 10 screens, 11 when A9 shows", () => {
    expect(questionsFor("athlete", { grade: 9, answers: {} })[0].key).toBe("goals")
    expect(questionsFor("athlete", { grade: 9, answers: {} })).toHaveLength(10)
    expect(questionsFor("athlete", { grade: 11, answers: {} })).toHaveLength(11)
    expect(questionsFor("athlete", { grade: 9, answers: { first_year: "compete_now" } }).map((q) => q.id)).toContain("A9")
    expect(showA9({ grade: 9, answers: { level_vs_opportunity: "level" } })).toBe(true)
    expect(showA9({ grade: 9, answers: { goals: ["career", "level"] } })).toBe(true)
    expect(showA9({ grade: 9, answers: { goals: ["career"] } })).toBe(false)
  })
  it("defaults: budget constraint-only, benefits and dealbreakers private, the rest shared", () => {
    expect(defaultSharing("parent", "budget")).toBe("constraint")
    expect(defaultSharing("parent", "benefits")).toBe("private")
    expect(defaultSharing("parent", "dealbreaker")).toBe("private")
    expect(defaultSharing("athlete", "dealbreaker")).toBe("private")
    expect(defaultSharing("parent", "home_zip")).toBe("private")
    expect(defaultSharing("parent", "divisions")).toBe("shared")
    expect(defaultSharing("athlete", "goals")).toBe("shared")
    expect(defaultSharing("parent", "success")).toBe("private")
    expect(defaultSharing("athlete", "success")).toBe("private")
  })
  it("the same seven goals on both sides", () => {
    const keys = (id: string) => (QUESTIONS.find((q) => q.id === id)!.kind as { options: Array<{ key: string }> }).options.map((o) => o.key)
    expect(keys("P0")).toEqual(keys("A0"))
    expect(keys("P0")).toHaveLength(7)
  })
  it("every screen says who sees the answer, and that coaches never do", () => {
    expect(sharingLine("shared", "athlete")).toMatch(/your parent.*Coaches never/)
    expect(sharingLine("constraint", "parent")).toBe("Only you see the number. Scout can use it for your suggestions.")
  })
  it("never asks income", () => {
    expect(JSON.stringify(QUESTIONS)).not.toMatch(/income/i)
  })
  it("nursing gets the BSN follow-up", () => {
    expect(wantsBsnFollowUp({ majors: ["51"] })).toBe(true)
    expect(wantsBsnFollowUp({ text: "Nursing" })).toBe(true)
    expect(wantsBsnFollowUp({ majors: ["52"] })).toBe(false)
  })
})

describe("cleanAnswer", () => {
  it("keeps only real options", () => {
    expect(cleanAnswer("parent", { key: "budget", value: "20_35" })).toMatchObject({ value: "20_35" })
    expect(cleanAnswer("parent", { key: "budget", value: "$25,000" })).toBeNull()
    expect(cleanAnswer("athlete", { key: "budget", value: "20_35" })).toBeNull()
  })
  it("'not sure' is a real answer", () => {
    expect(cleanAnswer("parent", { key: "budget", notSure: true })).toEqual({ key: "budget", value: null, marker: null, notSure: true })
  })
  it("caps picks and makes 'none' exclusive", () => {
    expect(cleanAnswer("athlete", { key: "experience", value: ["spirit", "team", "city"] })!.value).toEqual(["spirit", "team"])
    expect(cleanAnswer("parent", { key: "benefits", value: ["gi_bill", "none"] })!.value).toEqual(["none"])
  })
  it("grids keep known pathways and states; unanswered rows stay unanswered", () => {
    expect(cleanAnswer("parent", { key: "divisions", value: { D1: "not", D3: "open", D9: "interested", NAIA: "maybe" } })!.value).toEqual({ D1: "not", D3: "open" })
  })
  it("top 3: at most three, no repeats, fewer is fine", () => {
    expect(cleanAnswer("parent", { key: "goals", value: ["pay", "pay", "level", "career", "team", "bogus"] })!.value).toEqual(["pay", "level", "career"])
    expect(cleanAnswer("parent", { key: "goals", value: ["pay", "cost"] })!.value).toEqual(["pay"])
    // The retired closer is no longer an answer anyone can save.
    expect(cleanAnswer("parent", { key: "top3", value: ["cost"] })).toBeNull()
  })
  it("marker only where the question takes one", () => {
    expect(cleanAnswer("parent", { key: "distance", value: "5h", marker: "must" })!.marker).toBe("must")
    expect(cleanAnswer("parent", { key: "goals", value: ["pay"], marker: "must" })!.marker).toBeNull()
  })
  it("ZIP: five digits, parent only", () => {
    expect(cleanAnswer("parent", { key: "home_zip", value: "50063" })!.value).toBe("50063")
    expect(cleanAnswer("parent", { key: "home_zip", value: "5006" })).toBeNull()
    expect(cleanAnswer("athlete", { key: "home_zip", value: "50063" })).toBeNull()
  })
})

describe("prefill: never ask what we know", () => {
  const fit = { majors: ["14"], budget: 25000, homeZip: "27513", maxMiles: 200, size: "medium" as const, settings: ["town" as const] }
  it("a parent's Compare goals become suggested answers", () => {
    const p = prefillFor("parent", fit, { academicInterest: null })
    expect(p.distance.value).toBe("5h")
    expect(p.budget.value).toBe("20_35")
    expect(p.home_zip.value).toBe("27513")
    expect(p.school_feel.value).toEqual(["medium", "town"])
    expect(p.academics.value).toMatchObject({ majors: ["14"] })
  })
  it("the athlete's set never gets the budget or ZIP", () => {
    const p = prefillFor("athlete", fit, { academicInterest: null })
    expect(p.budget).toBeUndefined()
    expect(p.home_zip).toBeUndefined()
  })
  it("falls back to the profile's academic interest for the athlete", () => {
    expect(prefillFor("athlete", null, { academicInterest: "Engineering" }).academics.value).toMatchObject({ text: "Engineering" })
  })
  it("bands", () => {
    expect([distanceFromMiles(90), distanceFromMiles(400), distanceFromMiles(2000)]).toEqual(["2h", "day", "anywhere"])
    expect([budgetBand(8000), budgetBand(20000), budgetBand(60000)]).toEqual(["lt10", "10_20", "50plus"])
  })
})

describe("sharing classes", () => {
  const parent = set("parent", [a("distance", "5h"), a("budget", "10_20", "constraint"), a("benefits", ["gi_bill"], "private"), a("home_zip", "27513", "private"), a("dealbreaker", "No big cities", "private")])
  const athlete = set("athlete", [a("distance", "away"), a("dealbreaker", "No 6am lifts", "private")])
  const sets: FamilySets = { parent, athlete }

  it("the athlete sees only the parent's Shared answers", () => {
    const v = viewFor("athlete", sets)
    expect(v.other.map((x) => x.key)).toEqual(["distance"])
    expect(JSON.stringify(v)).not.toMatch(/10_20|gi_bill|27513|big cities/)
  })
  it("the parent sees only the athlete's Shared answers", () => {
    expect(JSON.stringify(viewFor("parent", sets).other)).not.toMatch(/6am/)
  })
  it("the owner sees all of their own", () => {
    expect(viewFor("parent", sets).own).toHaveLength(5)
    expect(ownerOnlyInputs("parent", sets).map((x) => x.key)).toEqual(["budget", "benefits", "home_zip", "dealbreaker"])
  })
  it("tightening a class removes it from the other view at once", () => {
    const tightened: FamilySets = { parent: { ...parent, answers: parent.answers.map((x) => (x.key === "distance" ? { ...x, sharing: "private" } : x)) }, athlete }
    expect(viewFor("athlete", tightened).other).toHaveLength(0)
  })
})

describe("inference leaks: joint inputs never move with a non-Shared answer", () => {
  const base = set("parent", [a("distance", "5h"), a("divisions", { D1: "interested" }), a("budget", "50plus", "constraint"), a("benefits", ["none"], "private")])
  const athlete = set("athlete", [a("divisions", { D3: "open" })])
  const variants: Answer[][] = [
    [a("budget", "lt10", "constraint")],
    [a("budget", "lt10", "constraint"), a("budget_kind", "limit", "constraint")],
    [a("benefits", ["gi_bill", "remission"], "private")],
    [a("home_zip", "99501", "private")],
    [a("dealbreaker", "Nothing west of the Mississippi", "private")],
  ]
  for (const extra of variants) {
    it(`unchanged when the parent changes ${extra.map((x) => x.key).join(" + ")}`, () => {
      const changed = set("parent", [...base.answers.filter((x) => !extra.some((e) => e.key === x.key)), ...extra])
      expect(jointInputs({ parent: changed, athlete })).toEqual(jointInputs({ parent: base, athlete }))
      expect(viewFor("athlete", { parent: changed, athlete })).toEqual(viewFor("athlete", { parent: base, athlete }))
    })
  }
  it("a Shared answer does move them (the test can fail)", () => {
    const changed = set("parent", base.answers.map((x) => (x.key === "distance" ? { ...x, value: "anywhere" } : x)))
    expect(jointInputs({ parent: changed, athlete })).not.toEqual(jointInputs({ parent: base, athlete }))
  })
})

describe("divisions: no veto", () => {
  const grid = (respondent: "parent" | "athlete", g: Record<string, string>, sharing: Answer["sharing"] = "shared") => set(respondent, [a("divisions", g, sharing)])
  it("leaves the joint lists only when both say not interested", () => {
    expect(jointPlacement(jointInputs({ parent: grid("parent", { D1: "not" }), athlete: grid("athlete", { D1: "not" }) }), "D1")).toBe("excluded")
  })
  it("one 'not' against interest keeps it explorable", () => {
    expect(jointPlacement(jointInputs({ parent: grid("parent", { D1: "not" }), athlete: grid("athlete", { D1: "interested" }) }), "D1")).toBe("explore")
  })
  it("unanswered is open, never excluded", () => {
    expect(jointPlacement(jointInputs({ parent: grid("parent", { D1: "not" }), athlete: grid("athlete", {}) }), "D1")).toBe("explore")
  })
  it("before the other side answers, one grid governs only its owner's own view", () => {
    const joint = jointInputs({ parent: grid("parent", { D3: "not" }), athlete: null })
    expect(jointPlacement(joint, "D3")).toBe("primary")
    expect(ownPlacement(grid("parent", { D3: "not" }).answers, "D3")).toBe("excluded")
  })
  it("a grid made private does not count jointly", () => {
    expect(jointPlacement(jointInputs({ parent: grid("parent", { D1: "not" }, "private"), athlete: grid("athlete", { D1: "not" }) }), "D1")).toBe("primary")
  })
})

describe("reactions", () => {
  it("a Cost reason on a pass takes the budget's class; the other side sees only 'Not for us'", () => {
    const sharing = reactionSharing("not_for_us", "cost", "constraint")
    expect(sharing).toBe("constraint")
    const r = { schoolId: "x", respondent: "parent" as const, reaction: "not_for_us" as const, reason: "cost", chips: [], sharing }
    expect(reactionSeenBy("athlete", r)).toEqual({ schoolId: "x", respondent: "parent", reaction: "not_for_us", reason: null, chips: [] })
    expect(reactionSeenBy("parent", r).reason).toBe("cost")
  })
  it("other reasons are Shared", () => {
    expect(reactionSharing("not_for_us", "too_far", "constraint")).toBe("shared")
    expect(reactionSharing("closer_look", null, "constraint")).toBe("shared")
  })
})

describe("two children", () => {
  it("money, ZIP and benefits carry over from the other child; distance and divisions do not", () => {
    const p = withSiblingPrefill({}, { firstName: "Gavin", answers: [
      { key: "budget", value: "20_35" }, { key: "budget_kind", value: "limit" }, { key: "home_zip", value: "27513" },
      { key: "benefits", value: ["gi_bill"] }, { key: "distance", value: "5h" }, { key: "divisions", value: { D1: "not" } },
    ] })
    expect(Object.keys(p).sort()).toEqual(["benefits", "budget", "budget_kind", "home_zip"])
    expect(p.budget.from).toBe("your answers for Gavin")
  })
  it("a 'not sure' is not carried over", () => {
    expect(withSiblingPrefill({}, { firstName: "Gavin", answers: [{ key: "budget", value: null, notSure: true }] })).toEqual({})
  })
})

describe("approved copy (Muse, 5 Nov)", async () => {
  const { athleteInviteText, shortListLine } = await import("./copy")
  it("asks no questions", () => {
    expect(athleteInviteText("Gavin", "https://x")).not.toContain("?")
    for (const r of ["no_results", "out_of_state", "womens"] as const) expect(shortListLine(r, "Tyde")).not.toContain("?")
  })
})
