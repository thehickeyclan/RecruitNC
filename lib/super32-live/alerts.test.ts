import { afterEach, describe, expect, it, vi } from "vitest"
import { queueAlerts, type SnapshotEntrant, type SnapshotRecap } from "./snapshot"

const entrant = (over: Partial<SnapshotEntrant>): SnapshotEntrant => ({
  name: "Nc Kid", team: "NC", gender: "boys", weight: "144", seed: null, wins: 2, losses: 0, status: "alive", placement: null,
  aaClinched: false, finalist: false, streak: 2, hotStreak: false, onFire: false, consiRun: false,
  athleteId: "a1", school: "Some HS", photo: null, classYear: 2027, chips: [], watch: null, bouts: [], ...over,
})
const recap = { label: "Round of 32", wins: 24, losses: 18, stillAlive: 42 } as SnapshotRecap
const PREV = "2026-10-25T14:00:00.000Z"
const hugeBout = { round: "Round of 32", win: true, opponent: "Jake Opp", opponentTeam: "PA", winType: "DEC", result: "7-4", tier: "huge" as const, upset: true, reasons: ["#3 seed"], opponentSeed: 3, key: "b1", seenAt: PREV }

const bigBout = { ...hugeBout, tier: "big" as const, upset: false, reasons: ["#20 seed"], opponentSeed: 20, opponent: "Sam Big", key: "b3" }
/** A pull that confirms what the previous pull (at PREV) first saw. */
const confirmRun = (es: SnapshotEntrant[]) => queueAlerts(es, es, new Set(), recap, "upload-1", "super32-2026", "snap", PREV)
const byName = (out: Array<Record<string, unknown>>, kind: string) => out.filter((a) => (kind === "wins" ? ["huge", "big"].includes(String(a.kind)) : a.kind === kind))

describe("alerts: wins and the championship side only", () => {
  afterEach(() => { vi.useRealTimers() })
  it("puts all newly confirmed Huge and Big wins in one push, Huge first", () => {
    const wins = byName(confirmRun([entrant({ bouts: [bigBout] }), entrant({ name: "Other Kid", athleteId: "a2", bouts: [hugeBout] })]), "wins")
    expect(wins).toHaveLength(1)
    expect(wins[0]!.dedupe_key).toBe("wins:upload-1")
    expect(wins[0]!.kind).toBe("huge")
    expect(wins[0]!.title).toBe("Super 32: 1 HUGE + 1 BIG wins for NC")
    expect(wins[0]!.body).toBe("HUGE: Other Kid (144) def. #3 seed Jake Opp (PA), Round of 32. Now 2-0. BIG: Nc Kid (144) def. #20 seed Sam Big (PA), Round of 32. Now 2-0.")
  })

  it("waits one pull: a result is pushed when the next pull still has it, never on first sight", () => {
    const fresh = { ...hugeBout, seenAt: "2026-10-25T14:05:00.000Z" }
    expect(byName(queueAlerts([entrant({ bouts: [fresh] })], [], new Set(["b1"]), recap, "u", "e", "s", PREV), "wins")).toHaveLength(0)
    expect(byName(confirmRun([entrant({ bouts: [hugeBout] })]), "wins")).toHaveLength(1)
    // Older than the previous pull: already pushed then, not again.
    expect(byName(confirmRun([entrant({ bouts: [{ ...hugeBout, seenAt: "2026-10-25T13:00:00.000Z" }] })]), "wins")).toHaveLength(0)
  })

  it("names an NC wrestler with no profile too", () => {
    const wins = byName(confirmRun([entrant({ athleteId: null, name: "Ellis Chia", weight: "285", bouts: [hugeBout] })]), "wins")
    expect(wins[0]!.body).toBe("HUGE: Ellis Chia (285) def. #3 seed Jake Opp (PA), Round of 32. Now 2-0.")
  })

  it("an All-American clinch always pushes, girls included, by forfeit included", () => {
    const qfLoss = { ...hugeBout, win: false, round: "Quarter-Finals", key: "q1", tier: null, seenAt: "2026-10-25T12:00:00.000Z" }
    const blood = { ...hugeBout, round: "Consi of 8 #2", tier: "win" as const, opponentSeed: null, opponent: "Kit Alsaker", opponentTeam: "WI", key: "c8" }
    const girl = entrant({ name: "Lauren Samuel", gender: "girls", weight: "132", aaClinched: true, wins: 4, losses: 1, status: "alive_consis", bouts: [qfLoss, blood] })
    const w = byName(confirmRun([girl]), "wins")
    expect(w[0]!.title).toBe("Lauren Samuel is a Super 32 All-American!")
    expect(w[0]!.body).toBe("NC WIN: Lauren Samuel (G132) def. Kit Alsaker (WI), Consi of 8 #2. Now 4-1, an All-American.")
    const yates = entrant({ name: "Braylen Yates", weight: "175", aaClinched: true, wins: 6, losses: 1, status: "alive_consis", bouts: [{ ...blood, winType: "M FOR", opponent: "Joel Welch", opponentSeed: 3, opponentTeam: "OH" }] })
    expect(byName(confirmRun([yates]), "wins")[0]!.body).toBe("ALL-AMERICAN: Braylen Yates (175) clinched with a medical forfeit win over #3 seed Joel Welch (OH), Consi of 8 #2. Now 6-1, an All-American.")
  })

  it("on day two any NC boys win alerts; on day one only Huge and Big do", () => {
    const plain = { ...hugeBout, tier: "win" as const, upset: false, reasons: [], opponentSeed: null, opponent: "Sam Plain", round: "Consi of 16 #1", key: "p1" }
    const kid = entrant({ status: "alive_consis", wins: 5, losses: 1, bouts: [plain] })
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T18:00:00Z"))
    expect(byName(confirmRun([kid]), "wins")).toHaveLength(0)
    vi.setSystemTime(new Date("2026-10-25T14:10:00Z"))
    const out = byName(confirmRun([kid]), "wins")
    expect(out[0]!.title).toBe("Nc Kid wins at Super 32")
    expect(out[0]!.body).toBe("NC WIN: Nc Kid (144) def. Sam Plain (PA), Consi of 16 #1. Now 5-1, alive.")
    expect(byName(confirmRun([{ ...kid, gender: "girls" as const }]), "wins")).toHaveLength(0)
  })

  it("lists who is unbeaten on the championship side only when that list changed", () => {
    const kid = entrant({ bouts: [hugeBout] })
    const first = byName(queueAlerts([kid], [], new Set(), recap, "u1", "e", "s"), "champ_side")
    expect(first).toHaveLength(1)
    expect(first[0]!.title).toBe("Super 32: 1 NC wrestler still in the championship bracket")
    expect(first[0]!.body).toBe("Unbeaten so far: Nc Kid (144).")
    expect(byName(queueAlerts([kid], [kid], new Set(), recap, "u2", "e", "s"), "champ_side")).toHaveLength(0)
    expect(byName(queueAlerts([{ ...kid, status: "alive_consis" as const }], [kid], new Set(), recap, "u3", "e", "s"), "champ_side")).toHaveLength(0)
  })

  it("sends no round recap", () => {
    expect(queueAlerts([entrant({ status: "eliminated", bouts: [] })], [], new Set(), recap, "u", "e", "s")).toHaveLength(0)
  })
})
