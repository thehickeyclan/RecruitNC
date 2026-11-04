import { describe, expect, it } from "vitest"

import { activationOf, activationRate } from "./cc-activation"

const NOW = "2026-11-02T12:00:00.000Z"

describe("activationOf", () => {
  it("is activated by an action within 7 days of the first visit", () => {
    const r = activationOf({ userId: "a", firstVisit: "2026-10-01T10:00:00.000Z", site: "ncu", actions: [{ action: "coach_emailed", at: "2026-10-06T10:00:00.000Z" }] }, NOW)
    expect(r.state).toBe("yes")
    expect(r.first?.action).toBe("coach_emailed")
  })

  it("does not count an action before the first visit or after day 7", () => {
    const r = activationOf(
      {
        userId: "a",
        firstVisit: "2026-10-01T10:00:00.000Z",
        site: null,
        actions: [
          { action: "school_saved", at: "2026-09-30T10:00:00.000Z" },
          { action: "visit_added", at: "2026-10-09T10:00:00.000Z" },
        ],
      },
      NOW,
    )
    expect(r.state).toBe("no")
  })

  it("leaves a family inside its first 7 days open until it acts", () => {
    expect(activationOf({ userId: "a", firstVisit: "2026-10-30T10:00:00.000Z", site: "rw", actions: [] }, NOW).state).toBe("open")
    expect(activationOf({ userId: "a", firstVisit: "2026-10-30T10:00:00.000Z", site: "rw", actions: [{ action: "coach_message", at: "2026-10-31T10:00:00.000Z" }] }, NOW).state).toBe("yes")
  })
})

describe("activationRate", () => {
  it("counts only families whose window is decided", () => {
    const rows = [
      { userId: "a", firstVisit: "", site: null, state: "yes" as const, first: null },
      { userId: "b", firstVisit: "", site: null, state: "no" as const, first: null },
      { userId: "c", firstVisit: "", site: null, state: "open" as const, first: null },
    ]
    expect(activationRate(rows)).toEqual({ activated: 1, decided: 2, open: 1, rate: 0.5 })
  })
})
