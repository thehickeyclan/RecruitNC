import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { dedupeBouts,
  parseFloExport,
  recap,
  roundOrder,
  scoreboard,
  splitDivisions,
  summarizeEntrants,
  tierWin,
  type Credential,
  type LiveBout,
  type SeedRow,
  type TierContext,
} from "./engine"

const FILE = path.join(process.cwd(), "scripts/data/super32-2025-flo-export.csv")
const rows = parseFloExport(fs.readFileSync(FILE, "utf8"))
const NO_TIERS: TierContext = { seeds: [], credentials: [], seedsFinal: false }

describe("2025 Flo export", () => {
  it("finds the verified 2025 NC boys' field: 91 wrestlers, 76-182, 7 winning records, 1 All-American", () => {
    const split = splitDivisions(rows, [])
    const s = scoreboard(summarizeEntrants(split.bouts, NO_TIERS), "boys")
    expect(s.wrestlers).toBe(91)
    expect([s.wins, s.losses]).toEqual([76, 182])
    expect(s.winningRecords).toBe(7)
    expect(s.allAmericans).toBe(1)
  })

  it("leaves a girls' weight out rather than guess when nothing identifies its bracket", () => {
    const split = splitDivisions(rows, [])
    expect(split.bouts.some((b) => b.gender === "girls")).toBe(false)
    expect(split.unresolved.some((u) => u.startsWith("girls 100"))).toBe(true)
  })

  it("picks the girls' bracket at a weight shared with middle school from a known name", () => {
    const split = splitDivisions(rows, [{ gender: "girls", weight: "100", name: "Jaclyn Bouzakis", state: "NC" }])
    const jac = summarizeEntrants(split.bouts, NO_TIERS).find((e) => e.name === "Jaclyn Bouzakis")!
    expect(jac.gender).toBe("girls")
    expect([jac.wins, jac.losses, jac.placement, jac.finalist]).toEqual([5, 0, 1, true])
  })

  it("clinches All-American on a Consi of 8 #2 win: Bentley Sly, 4th at 150", () => {
    const sly = summarizeEntrants(splitDivisions(rows, []).bouts, NO_TIERS).find((e) => e.name === "Bentley Sly")!
    expect([sly.wins, sly.losses, sly.placement, sly.aaClinched]).toEqual([8, 2, 4, true])
    expect(sly.bouts.map((b) => b.bout.round).at(-1)).toBe("3rd Place")
  })
})

describe("round order", () => {
  it("runs championship, then consolation from the deepest field, then placement", () => {
    const rounds = ["3rd Place", "Consi-Semis", "Consi of 4", "Consi of 8 #2", "Consi of 8 #1", "Round of 16", "Round of 128"]
    expect([...rounds].sort((a, b) => roundOrder(a) - roundOrder(b))).toEqual([
      "Round of 128", "Round of 16", "Consi of 8 #1", "Consi of 8 #2", "Consi of 4", "Consi-Semis", "3rd Place",
    ])
  })
})

const bout = (over: Partial<LiveBout> = {}): LiveBout => ({
  date: "", weight: "144", round: "Round of 32", winner: "Nc Kid", winnerTeam: "NC", result: "7-4", winType: "DEC",
  loser: "Jake Opp", loserTeam: "PA", gender: "boys", key: "k", ...over,
})
const seeds = (seed: number, name = "Jake Opp", state = "PA"): SeedRow[] => [{ gender: "boys", weight: "144", seed, name, state }]
const ctx = (s: SeedRow[] = [], credentials: Credential[] = []): TierContext => ({ seeds: s, credentials, seedsFinal: true })

describe("win tiers", () => {
  it("a #1-12 seed is HUGE, #13-32 BIG (Matt, 23 Oct)", () => {
    expect(tierWin(bout(), ctx(seeds(1))).tier).toBe("huge")
    expect(tierWin(bout(), ctx(seeds(12))).tier).toBe("huge")
    expect(tierWin(bout(), ctx(seeds(13))).tier).toBe("big")
    const deep = tierWin(bout(), ctx(seeds(32)))
    expect([deep.tier, deep.opponentSeed]).toEqual(["big", 32])
  })

  it("an unseeded NC kid over a #9 seed is an upset HUGE win", () => {
    const w = tierWin(bout(), ctx(seeds(9)))
    expect([w.tier, w.upset]).toEqual(["huge", true])
  })

  it("only seeds make Huge or Big; an unseeded ranked opponent is a Significant win", () => {
    const cred = (rank: number): Credential => ({ name: "Jake Opp", state: "PA", gender: "boys", kind: "national_rank", rank, label: `#${rank} nationally (SI)` })
    const w = tierWin(bout(), ctx([], [cred(4)]))
    expect([w.tier, w.reasons]).toEqual(["significant", ["#4 nationally (SI)"]])
    expect(tierWin(bout(), ctx(seeds(20), [cred(4)])).reasons).toEqual(["#20 seed", "#4 nationally (SI)"])
    expect(tierWin(bout(), ctx([], [cred(38)])).reasons).toEqual([])
    expect(tierWin(bout(), ctx([], [cred(38)])).tier).toBe("win")
    const placer = (rank: number): Credential => ({ name: "Jake Opp", state: "PA", gender: "boys", kind: "state_placer", rank, label: `2026 PA AAA state ${rank}` })
    expect(tierWin(bout(), ctx([], [placer(2)])).tier).toBe("significant")
    expect(tierWin(bout(), ctx([], [placer(3)])).tier).toBe("win")
  })

  it("never tiers a forfeit, and ignores a credential held by someone in another state", () => {
    expect(tierWin(bout({ winType: "M FOR" }), ctx(seeds(1))).tier).toBe("win")
    expect(tierWin(bout(), ctx(seeds(1, "Jake Opp", "NJ"))).tier).toBe("win")
  })

  it("preliminary seeds tier nothing", () => {
    expect(tierWin(bout(), { ...ctx(seeds(1)), seedsFinal: false }).tier).toBe("win")
  })
})

describe("recap", () => {
  it("is a template filled from the import's new bouts", () => {
    const b = bout({ key: "new" })
    const es = summarizeEntrants([b], ctx(seeds(3)))
    const r = recap(es, new Set(["new"]))
    expect(r.sentence).toBe("North Carolina went 1-0 since the last update, with 1 seeded win. 1 NC wrestler remains alive. Nc Kid (144) beat #3 seed.")
    expect(r.topPerformance?.win.tier).toBe("huge")
  })
})

describe("round label", () => {
  it("names an upload by the championship round most of its matches came from", async () => {
    const { ROUND_LABEL } = await import("./engine")
    expect(ROUND_LABEL(["Round of 32", "Consi of 64 #2", "Consi of 64 #2"])).toBe("Round of 32")
    expect(ROUND_LABEL(["Round of 64", "Round of 64", "Round of 32", "Round of 256"])).toBe("Round of 64")
    expect(ROUND_LABEL(["Round of 64", "Round of 32"])).toBe("Round of 32")
    expect(ROUND_LABEL(["Consi of 32 #1", "Consi of 32 #1", "Consi of 16 #2"])).toBe("Consi of 32 #1")
  })
})

describe("official field", () => {
  it("an unseeded entrant never tiers a win and joins the page before the first match", async () => {
    const { addUnstartedSeeds } = await import("./engine")
    const field: SeedRow[] = [{ gender: "boys", weight: "144", seed: null, name: "Jake Opp", state: "PA" }, { gender: "boys", weight: "150", seed: null, name: "Nc Kid", state: "NC" }]
    expect(tierWin(bout(), ctx(field)).tier).toBe("win")
    const es = addUnstartedSeeds([], field)
    expect(es.map((e) => [e.name, e.seed, e.status])).toEqual([["Nc Kid", null, "not_started"]])
  })
})

describe("record against seeds", () => {
  it("counts wins and losses against seeded opponents", () => {
    const field: SeedRow[] = [{ gender: "boys", weight: "144", seed: 5, name: "Jake Opp", state: "PA" }, { gender: "boys", weight: "144", seed: 20, name: "Sam Seed", state: "OH" }]
    const won = bout({ key: "a" })
    const lost = bout({ key: "b", round: "Round of 16", winner: "Sam Seed", winnerTeam: "OH", loser: "Nc Kid", loserTeam: "NC" })
    const sb = scoreboard(summarizeEntrants([won, lost], ctx(field)))
    expect([sb.seededWins, sb.seededLosses]).toEqual([1, 1])
  })
})

describe("finalists", () => {
  it("counts a finalist as soon as he wins his semifinal", () => {
    const semi = bout({ key: "s", round: "Semi-Finals" })
    const sb = scoreboard(summarizeEntrants([semi], ctx()))
    expect(sb.finalists).toBe(1)
  })
})

describe("dedupeBouts", () => {
  const row = (winner: string, loser: string, result = "Dec 3-1", round = "Champ. Round 1") =>
    ({ date: "", weight: "138", round, winner, winnerTeam: "A", result, winType: "Dec", loser, loserTeam: "B" })
  it("keeps one row for a repeated bout", () => {
    expect(dedupeBouts([row("Al Smith", "Bo Jones"), row("Al Smith", "Bo Jones")])).toHaveLength(1)
  })
  it("treats a reversed result as a correction and keeps the later row", () => {
    const out = dedupeBouts([row("Al Smith", "Bo Jones"), row("Bo Jones", "Al Smith", "Dec 4-2")])
    expect(out).toHaveLength(1)
    expect(out[0].winner).toBe("Bo Jones")
  })
  it("keeps a rematch in a different round", () => {
    expect(dedupeBouts([row("Al Smith", "Bo Jones"), row("Al Smith", "Bo Jones", "Dec 2-0", "Cons. Round 4")])).toHaveLength(2)
  })
})

describe("splitDivisions early in the day", () => {
  it("keeps first-round bouts while each bracket is still unconnected pairs", () => {
    const r = (w: string, wt: string, l: string, lt: string, weight = "113") =>
      ({ date: "", weight, round: "Round of 256", winner: w, winnerTeam: wt, result: "Dec 3-1", winType: "DEC", loser: l, loserTeam: lt })
    const rows = [r("Jha'kai Roller", "TN", "Benjamin Ellison", "NC"), r("Gabe Benyo", "PA", "Colton Farmer", "NC", "126")]
    const hints = [
      { gender: "boys" as const, weight: "113", name: "Benjamin Ellison", state: "NC" },
      { gender: "boys" as const, weight: "126", name: "Colton Farmer", state: "NC" },
    ]
    expect(splitDivisions(rows, hints).bouts).toHaveLength(2)
  })
})
