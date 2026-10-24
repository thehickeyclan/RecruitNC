import { describe, expect, it } from "vitest"
import { queueAlerts, type SnapshotEntrant, type SnapshotRecap } from "./snapshot"

const entrant = (over: Partial<SnapshotEntrant>): SnapshotEntrant => ({
  name: "Nc Kid", team: "NC", gender: "boys", weight: "144", seed: null, wins: 2, losses: 0, status: "alive", placement: null,
  aaClinched: false, finalist: false, streak: 2, hotStreak: false, onFire: false, consiRun: false,
  athleteId: "a1", school: "Some HS", photo: null, classYear: 2027, chips: [], watch: null, bouts: [], ...over,
})
const recap = { label: "Round of 32", wins: 24, losses: 18, stillAlive: 42 } as SnapshotRecap
const hugeBout = { round: "Round of 32", win: true, opponent: "Jake Opp", opponentTeam: "PA", winType: "DEC", result: "7-4", tier: "huge" as const, upset: true, reasons: ["#3 seed"], opponentSeed: 3, key: "b1" }

const bigBout = { ...hugeBout, tier: "big" as const, upset: false, reasons: ["#20 seed"], opponentSeed: 20, opponent: "Sam Big", key: "b3" }
const byName = (out: Array<Record<string, unknown>>, kind: string) => out.filter((a) => (kind === "wins" ? ["huge", "big"].includes(String(a.kind)) : a.kind === kind))

describe("alerts: wins and the championship side only", () => {
  it("puts all new Huge and Big wins in one push, Huge first", () => {
    const out = queueAlerts([entrant({ bouts: [bigBout] }), entrant({ name: "Other Kid", athleteId: "a2", bouts: [hugeBout] })], [], new Set(["b1", "b3"]), recap, "upload-1", "super32-2026", "snap")
    const wins = byName(out, "wins")
    expect(wins).toHaveLength(1)
    expect(wins[0]!.dedupe_key).toBe("wins:upload-1")
    expect(wins[0]!.kind).toBe("huge")
    expect(wins[0]!.title).toBe("Super 32: 1 HUGE + 1 BIG wins for NC")
    expect(wins[0]!.body).toBe("HUGE: Other Kid (144) def. #3 seed Jake Opp (PA). BIG: Nc Kid (144) def. #20 seed Sam Big (PA).")
  })

  it("never names a wrestler without a linked NC profile, and skips wins from earlier uploads", () => {
    const out = queueAlerts([entrant({ athleteId: null, bouts: [hugeBout] }), entrant({ name: "Old", athleteId: "a3", bouts: [{ ...hugeBout, key: "old" }] })], [], new Set(["b1"]), recap, "u", "e", "s")
    expect(byName(out, "wins")).toHaveLength(0)
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
