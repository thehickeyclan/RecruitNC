/**
 * The two-account leak suite (priorities part 5). One family, a parent and a wrestler, run through
 * every output each side can see: the lists, the alignment card, reactions on cards, and the
 * survey API's view of the other side. The rule under test is the spec's inference-leak rule: one
 * side's output must not change in ANY way when the other side changes only non-Shared answers or
 * the reason behind a Cost pass. Randomised variants, a fixed seed so a failure reproduces.
 *
 * A source guard keeps the set of readers closed: a new file that reads the survey tables (a coach
 * route, an export, Scout) fails here until it is added on purpose and covered.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { alignmentFor } from "./alignment"
import type { Respondent, SharingClass } from "./questions"
import { reactionsFor, type ReactionRow } from "./reactions"
import { recommend, type CollegeFacts } from "./recommend"
import { jointInputs, ownerOnlyInputs, reactionSharing, viewFor, type Answer, type FamilySets } from "./sharing"

let seed = 20261105
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!
const some = <T,>(xs: readonly T[]): T[] => xs.filter(() => rand() < 0.5)

const college = (id: string, over: Partial<CollegeFacts> = {}): CollegeFacts => ({
  id, name: id, level: "D2", state: "NC", place: "Somewhere, NC", latitude: 35.5, longitude: -79.5, inState: true, athletic: "fit", academic: "fit",
  majors: ["52"], undergrads: 3000, setting: "town", openWeights: [], rosterSeason: "2026-27", sticker: 30_000, averageNet: 20_000,
  calculator: "https://example.edu/npc", serviceAcademy: false, coachViews: 0, coachNeedWeight: null, firstSeason: null, ...over,
})
const COLLEGES = [
  college("near-cheap", { sticker: 9_000, averageNet: 8_000 }),
  college("near-dear", { sticker: 62_000, averageNet: 41_000, openWeights: [165] }),
  college("far", { state: "TX", inState: false, latitude: 30.6, longitude: -96.3, coachViews: 3 }),
  college("d1", { level: "D1", athletic: "stretch", openWeights: [157] }),
  college("d3", { level: "D3", undergrads: 1500 }),
  college("naia", { level: "NAIA", coachNeedWeight: 165 }),
]
const a = (key: string, value: unknown, sharing: SharingClass = "shared"): Answer => ({ key, value, sharing, marker: null })
const set = (respondent: Respondent, answers: Answer[]) => ({ id: `${respondent}-1`, respondent, version: 1, completedAt: "2026-11-05", answers })

const PARENT_SHARED = [a("distance", "5h"), a("divisions", { D1: "interested", D2: "interested", D3: "open", NAIA: "not" }), a("top3", ["cost", "academics", "level"]), a("academics", { majors: ["52"] })]
const ATHLETE_SHARED = [a("distance", "away"), a("divisions", { D1: "interested", D2: "interested", D3: "not", NAIA: "interested" }), a("top3", ["level", "compete_early", "academics"]), a("academics", { majors: ["52", "14"] }), a("first_year", "compete_now")]

/** One side's non-Shared answers, at random: the things the other side must never be able to infer. */
function parentPrivate(): Answer[] {
  return [
    ...(rand() < 0.8 ? [a("budget", pick(["lt10", "10_20", "20_35", "35_50", "50plus"]), pick(["constraint", "private"] as const))] : []),
    ...(rand() < 0.6 ? [a("budget_kind", pick(["limit", "target"]), "constraint")] : []),
    ...(rand() < 0.6 ? [a("home_zip", pick(["27601", "28202", "99999"]), "private")] : []),
    ...(rand() < 0.5 ? [a("benefits", some(["gi_bill", "ch35", "remission", "need_aid"]), "private")] : []),
    ...(rand() < 0.5 ? [a("dealbreaker", pick(["no snow", "nothing over 4 hours", "no big cities"]), "private")] : []),
    // A normally-Shared question the parent made private.
    ...(rand() < 0.5 ? [a("school_feel", some(["small", "large", "city", "rural"]), "private")] : []),
  ]
}
function athletePrivate(): Answer[] {
  return [
    ...(rand() < 0.6 ? [a("dealbreaker", pick(["no early practices", "not near home"]), "private")] : []),
    ...(rand() < 0.5 ? [a("experience", some(["spirit", "close_knit", "city"]), "private")] : []),
    ...(rand() < 0.5 ? [a("service", pick(["interested", "not"]), "constraint")] : []),
  ]
}
const row = (school_id: string, respondent: Respondent, over: Partial<ReactionRow> = {}): ReactionRow => ({
  school_id, respondent, reaction: "closer_look", reason: null, chips: [], sharing: "shared", created_at: "2026-11-05T10:00:00Z", ...over,
})
/** The parent passes on a college; the only variable is a Cost reason, which takes the budget's class. */
const costPass = (school: string): ReactionRow => row(school, "parent", { reaction: "not_for_us", reason: "cost", sharing: reactionSharing("not_for_us", "cost", "constraint") })
const plainPass = (school: string): ReactionRow => row(school, "parent", { reaction: "not_for_us", reason: null })

/** Everything a viewer can see, serialised. */
function everythingSeenBy(viewer: Respondent, sets: FamilySets, rows: ReactionRow[]): string {
  const joint = jointInputs(sets)
  const reactions = reactionsFor(viewer, rows)
  const lists = recommend({
    viewer, joint, own: ownerOnlyInputs(viewer, sets), colleges: COLLEGES, weights: { near: [165, 157], up: 174 }, arrivalFall: 2028,
    firstName: "Sam", homeState: "NC", centre: [35.5, -79.5], zipPoint: (z) => (z === "27601" ? [35.77, -78.64] : z === "28202" ? [35.22, -80.84] : null),
    passed: new Set(Object.entries(reactions.mine).filter(([, r]) => r.reaction === "not_for_us").map(([id]) => id)),
  })
  const alignment = alignmentFor({ viewer, joint, reactions, other: viewer === "parent" ? "Sam" : "your parent", schoolName: (id) => id })
  const api = viewFor(viewer, sets).other
  return JSON.stringify({ lists, alignment, theirs: reactions.theirs, api })
}

describe("two-account leak suite", () => {
  it("the wrestler sees nothing that moves with the parent's private answers or a Cost reason (200 variants)", () => {
    const athlete = set("athlete", ATHLETE_SHARED)
    const rowsWith = (r: ReactionRow) => [row("far", "athlete"), r]
    const baseline = everythingSeenBy("athlete", { parent: set("parent", PARENT_SHARED), athlete }, rowsWith(plainPass("near-dear")))
    for (let i = 0; i < 200; i++) {
      const sets = { parent: set("parent", [...PARENT_SHARED, ...parentPrivate()]), athlete }
      // A pass for Cost reads exactly like a pass with no reason.
      expect(everythingSeenBy("athlete", sets, rowsWith(rand() < 0.5 ? costPass("near-dear") : plainPass("near-dear")))).toBe(baseline)
    }
  })

  it("the parent sees nothing that moves with the wrestler's private answers (200 variants)", () => {
    const parent = set("parent", PARENT_SHARED)
    const baseline = everythingSeenBy("parent", { parent, athlete: set("athlete", ATHLETE_SHARED) }, [])
    for (let i = 0; i < 200; i++) {
      expect(everythingSeenBy("parent", { parent, athlete: set("athlete", [...ATHLETE_SHARED, ...athletePrivate()]) }, [])).toBe(baseline)
    }
  })

  it("the suite would catch a leak: the parent's own view does move with the budget", () => {
    const athlete = set("athlete", ATHLETE_SHARED)
    const low = everythingSeenBy("parent", { parent: set("parent", [...PARENT_SHARED, a("budget", "lt10", "constraint"), a("budget_kind", "limit", "constraint")]), athlete }, [])
    const high = everythingSeenBy("parent", { parent: set("parent", [...PARENT_SHARED, a("budget", "50plus", "constraint"), a("budget_kind", "limit", "constraint")]), athlete }, [])
    expect(low).not.toBe(high)
  })

  it("a Shared answer does reach the other side (the boundary is the class, not the question)", () => {
    const athlete = set("athlete", ATHLETE_SHARED)
    const shared = everythingSeenBy("athlete", { parent: set("parent", [...PARENT_SHARED, a("school_feel", ["small"], "shared")]), athlete }, [])
    const hidden = everythingSeenBy("athlete", { parent: set("parent", [...PARENT_SHARED, a("school_feel", ["small"], "private")]), athlete }, [])
    expect(shared).not.toBe(hidden)
  })
})

describe("readers of the survey tables are a closed set", () => {
  const ALLOWED = new Set([
    "app/my-recruiting/priority-lists.ts",
    "app/api/recruiting-priorities/route.ts",
    "app/api/recruiting-priorities/reactions/route.ts",
    "lib/recruiting/priorities/store.ts",
  ])
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) ? [p] : []
    })
  it("no coach route, export or Scout reads answers, batches or reactions", () => {
    const readers = ["app", "lib", "components"].flatMap(walk).filter((f) => /priority_answers|priority_answer_sets|suggestion_batches|suggestion_reactions|loadFamilySets/.test(readFileSync(f, "utf8")))
    expect(readers.filter((f) => !ALLOWED.has(f))).toEqual([])
  })
})
