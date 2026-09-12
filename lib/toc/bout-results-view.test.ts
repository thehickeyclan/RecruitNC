import { describe, expect, it } from "vitest"
import { lastRecordedAt, toBoutResultsView, type BoutResultRow } from "./bout-results-view"

const row = (over: Partial<BoutResultRow> = {}): BoutResultRow => ({
  bout_number: 1,
  winner_athlete_id: "a1",
  method: "Fall",
  winner_score: null,
  loser_score: null,
  recorded_at: "2026-09-18T14:00:00Z",
  updated_at: "2026-09-18T14:00:00Z",
  ...over,
})

describe("toBoutResultsView", () => {
  it("maps bouts to winners, which is what the bracket advances on", () => {
    const view = toBoutResultsView([row(), row({ bout_number: 2, winner_athlete_id: "b2" })])
    expect(view.winners).toEqual({ 1: "a1", 2: "b2" })
    expect(view.recorded).toBe(2)
  })

  it("keeps the method and score beside the winner", () => {
    const view = toBoutResultsView([row({ method: "Dec", winner_score: 7, loser_score: 3 })])
    expect(view.outcomes[1]).toEqual({ method: "Dec", winnerScore: 7, loserScore: 3 })
  })

  it("treats a blank method as no method rather than an empty label", () => {
    expect(toBoutResultsView([row({ method: "   " })]).outcomes[1].method).toBeNull()
  })

  it("ignores a row with no winner — it says nothing, and scoring skips it too", () => {
    const view = toBoutResultsView([row({ winner_athlete_id: "" }), row({ bout_number: 3, winner_athlete_id: "c3" })])
    expect(view.winners).toEqual({ 3: "c3" })
    expect(view.recorded).toBe(1)
  })

  it("reports the newest write, because a screen that cannot say how fresh it is looks broken", () => {
    const view = toBoutResultsView([
      row({ updated_at: "2026-09-18T14:00:00Z" }),
      row({ bout_number: 2, winner_athlete_id: "b2", updated_at: "2026-09-18T15:30:00Z" }),
    ])
    expect(view.lastUpdated).toBe("2026-09-18T15:30:00Z")
  })

  it("falls back to when a result was first recorded if it was never edited", () => {
    expect(lastRecordedAt([row({ recorded_at: "2026-09-18T13:00:00Z", updated_at: null })])).toBe(
      "2026-09-18T13:00:00Z",
    )
  })

  it("has nothing to report before the first bout is in", () => {
    expect(toBoutResultsView([])).toEqual({ winners: {}, outcomes: {}, recorded: 0, lastUpdated: null })
  })
})
