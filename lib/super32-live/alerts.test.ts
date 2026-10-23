import { describe, expect, it } from "vitest"
import { queueAlerts, type SnapshotEntrant, type SnapshotRecap } from "./snapshot"

const entrant = (over: Partial<SnapshotEntrant>): SnapshotEntrant => ({
  name: "Nc Kid", team: "NC", gender: "boys", weight: "144", seed: null, wins: 2, losses: 0, status: "alive", placement: null,
  aaClinched: false, finalist: false, streak: 2, hotStreak: false, onFire: false, consiRun: false,
  athleteId: "a1", school: "Some HS", photo: null, classYear: 2027, chips: [], watch: null, bouts: [], ...over,
})
const recap = { label: "Round of 32", wins: 24, losses: 18, stillAlive: 42 } as SnapshotRecap
const hugeBout = { round: "Round of 32", win: true, opponent: "Jake Opp", opponentTeam: "PA", winType: "DEC", result: "7-4", tier: "huge" as const, upset: true, reasons: ["#3 seed"], opponentSeed: 3, key: "b1" }

describe("round alert", () => {
  it("is one push per upload, naming that round's Huge wins", () => {
    const out = queueAlerts([entrant({ bouts: [hugeBout] }), entrant({ name: "Other Kid", athleteId: "a2", bouts: [{ ...hugeBout, key: "b2" }] })], [], new Set(["b1", "b2"]), recap, "upload-1", "super32-2026", "snap")
    expect(out).toHaveLength(1)
    expect(out[0]!.dedupe_key).toBe("round:upload-1")
    expect(out[0]!.title).toBe("Super 32 · Round of 32: 2 HUGE WINS for NC")
    expect(out[0]!.body).toContain("NC went 24-18. 42 still alive. HUGE: Nc Kid (144) def. #3 seed Jake Opp (PA).")
  })

  it("never names a wrestler without a linked NC profile, and skips wins from earlier uploads", () => {
    const out = queueAlerts([entrant({ athleteId: null, bouts: [hugeBout] }), entrant({ name: "Old", athleteId: "a3", bouts: [{ ...hugeBout, key: "old" }] })], [], new Set(["b1"]), recap, "u", "e", "s")
    expect(out[0]!.body).not.toContain("HUGE")
    expect(out[0]!.title).toBe("Super 32 · Round of 32 recap")
  })

  it("announces an All-American only once, in the upload that clinched it", () => {
    const now = entrant({ aaClinched: true, bouts: [] })
    expect(queueAlerts([now], [], new Set(), recap, "u", "e", "s")[0]!.body).toContain("All-American: Nc Kid (144)")
    expect(queueAlerts([now], [now], new Set(), recap, "u", "e", "s")[0]!.body).not.toContain("All-American")
  })
})
