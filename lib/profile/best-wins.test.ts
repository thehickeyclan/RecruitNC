import { describe, expect, it } from "vitest"
import { bestWinsLast12Months, type BestWinInput } from "./best-wins"

const NOW = new Date("2026-10-11T12:00:00Z")
const win = (opponent: string, reason: string, date: string, credential: string | null = "Accolade"): BestWinInput => ({
  opponent, reason, date, credential, event: "Event", result: "Dec 3-1",
})

describe("best wins of the last 12 months", () => {
  it("orders by what the opponent is, then by date", () => {
    const out = bestWinsLast12Months(
      [
        win("State Placer", "state-placer", "2026-09-18"),
        win("All American", "national-placer", "3/28/2026"),
        win("State Champ", "state-champion", "2026-02-21"),
        win("National Rank", "national-ranked", "2025-12-01"),
      ],
      NOW,
    )
    expect(out.map((w) => w.opponent)).toEqual(["National Rank", "State Champ", "All American"])
    expect(out[2]!.detail).toBe("Dec 3-1 · Event · Mar 2026")
  })

  it("leaves out a win matched on an NC ranking alone, an old win, and one with no accolade", () => {
    const out = bestWinsLast12Months(
      [
        win("Name Only", "ranked", "2026-09-01"),
        win("Too Old", "state-champion", "2025-09-01"),
        win("No Label", "state-placer", "2026-09-01", null),
        win("Kept", "state-placer", "2026-08-01"),
      ],
      NOW,
    )
    expect(out.map((w) => w.opponent)).toEqual(["Kept"])
  })

  it("lists an opponent once", () => {
    const out = bestWinsLast12Months([win("Same Kid", "state-champion", "2026-09-01"), win("same kid", "state-champion", "2026-03-01")], NOW)
    expect(out).toHaveLength(1)
  })
})
