import { describe, expect, it } from "vitest"

import { alignmentFor } from "./alignment"
import type { Respondent, SharingClass } from "./questions"
import { reactionsFor, type ReactionRow } from "./reactions"
import { jointInputs, reactionSharing, type Answer, type FamilySets } from "./sharing"

const a = (key: string, value: unknown, sharing: SharingClass = "shared"): Answer => ({ key, value, sharing, marker: null })
const set = (respondent: Respondent, answers: Answer[]) => ({ id: `${respondent}-1`, respondent, version: 1, completedAt: "2026-11-05", answers })
const PARENT = [
  a("distance", "2h"),
  a("divisions", { D1: "interested", D2: "interested", D3: "not" }),
  a("level_vs_opportunity", "opportunity"),
  a("top3", ["cost", "academics", "distance"]),
  a("academics", { majors: ["52", "51"] }),
]
const ATHLETE = [
  a("distance", "away"),
  a("divisions", { D1: "interested", D2: "interested", D3: "interested" }),
  a("level_vs_opportunity", "level"),
  a("top3", ["level", "academics", "coaching"]),
  a("academics", { majors: ["52"] }),
]
const NAMES: Record<string, string> = { roanoke: "Roanoke College", ferrum: "Ferrum College" }
const run = (viewer: Respondent, sets: FamilySets, rows: ReactionRow[] = []) =>
  alignmentFor({ viewer, joint: jointInputs(sets), reactions: reactionsFor(viewer, rows), other: viewer === "parent" ? "Gavin" : "your parent", schoolName: (id) => NAMES[id] ?? null })
const sets = (parentExtra: Answer[] = []): FamilySets => ({ parent: set("parent", [...PARENT, ...parentExtra]), athlete: set("athlete", ATHLETE) })
const texts = (x: ReturnType<typeof run>) => [...(x?.agree ?? []), ...(x?.differ ?? [])].map((l) => l.text)

describe("alignment card", () => {
  it("needs both sides", () => {
    expect(run("parent", { parent: set("parent", PARENT), athlete: null })).toBeNull()
  })

  it("names agreement and differences from the viewer's side", () => {
    const p = run("parent", sets())!
    expect(p.agree.map((l) => l.text)).toEqual(expect.arrayContaining(["You both want D1 and D2.", "You both have academics and the major in your top 3.", "You both picked " + p.agree.find((l) => l.topic === "majors")!.text.slice(16)]))
    expect(p.differ.map((l) => l.text)).toEqual(
      expect.arrayContaining([
        "D3: Gavin is interested, you are not. It stays on Opportunities.",
        "Distance: You lean close to home, gavin wants to get farther away.".replace("gavin", "Gavin"),
        "You lean toward the best chance to compete. Gavin leans toward the highest level possible.",
        "Your #1 is cost. Gavin's #1 is highest level possible.",
      ]),
    )
    const w = run("athlete", sets())!
    expect(w.differ.map((l) => l.text)).toContain("D3: you're interested, your parent is not. It stays on Opportunities.")
    expect(w.differ.map((l) => l.text)).toContain("Distance: Your parent leans close to home, you want to get farther away.")
  })

  it("inference leak: the wrestler's card never moves with the parent's non-Shared answers", () => {
    const base = texts(run("athlete", sets()))
    for (const extra of [
      [a("budget", "lt10", "constraint")],
      [a("budget", "50plus", "constraint"), a("home_zip", "27601", "private")],
      [a("benefits", ["gi_bill"], "private"), a("dealbreaker", "no snow", "private")],
    ])
      expect(texts(run("athlete", sets(extra)))).toEqual(base)
    // A Shared answer made private drops out of the other side's card.
    const hidden: FamilySets = { parent: set("parent", PARENT.map((x) => (x.key === "distance" ? { ...x, sharing: "private" as const } : x))), athlete: set("athlete", ATHLETE) }
    expect(texts(run("athlete", hidden)).some((t) => t.startsWith("Distance"))).toBe(false)
  })

  it("'not sure' and skipped answers say nothing", () => {
    const unsure: FamilySets = { parent: set("parent", [{ ...a("distance", "2h"), notSure: true }]), athlete: set("athlete", [a("distance", "away")]) }
    expect(run("parent", unsure)).toBeNull()
  })

  it("reactions: a keep against a pass, and a Cost reason stays hidden from the other side", () => {
    const row = (over: Partial<ReactionRow> & { school_id: string; respondent: Respondent }): ReactionRow => ({ reaction: "closer_look", reason: null, chips: [], sharing: "shared", created_at: "2026-11-05T10:00:00Z", ...over })
    const rows = [
      row({ school_id: "roanoke", respondent: "athlete" }),
      row({ school_id: "roanoke", respondent: "parent", reaction: "not_for_us", reason: "cost", sharing: reactionSharing("not_for_us", "cost", "constraint") }),
      row({ school_id: "ferrum", respondent: "athlete" }),
      row({ school_id: "ferrum", respondent: "parent" }),
    ]
    expect(texts(run("athlete", sets(), rows))).toEqual(expect.arrayContaining(["You kept Roanoke College. Your parent passed. Worth a look together.", "You both want a closer look at Ferrum College."]))
    expect(texts(run("parent", sets(), rows))).toContain("Gavin kept Roanoke College. You passed (cost). Worth a look together.")
  })

  it("never asks a question and caps each side at four", () => {
    const x = run("parent", sets())!
    expect(texts(x).every((t) => !t.includes("?"))).toBe(true)
    expect(x.agree.length).toBeLessThanOrEqual(4)
    expect(x.differ.length).toBeLessThanOrEqual(4)
  })
})
