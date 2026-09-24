import { describe, expect, it } from "vitest"
import { buildNchsaaStateRows } from "@/lib/profile/tournament-rows"

describe("buildNchsaaStateRows", () => {
  it("uses the same expandable tournament-row shape as TOC", () => {
    const rows = buildNchsaaStateRows(
      [{ year: 2026, place: 2, classification: "7A", weight_class: "113" }],
      [
        { year: 2026, date: "2/21/2026", weight: "113", opponent: "Ryder Menard", opponentSchool: "Lake Norman", outcome: "W", method: "SV-1" },
        { year: 2026, date: "2/21/2026", weight: "113", opponent: "Trevelian Hall", opponentSchool: "Lumberton", outcome: "L", method: "Dec" },
      ],
    )
    expect(rows[0]).toMatchObject({
      event: "NCHSAA 7A State Championships",
      year: 2026,
      weight: "113",
      placement: "2nd",
      record: "1-1",
    })
    expect(rows[0].bouts).toHaveLength(2)
    expect(rows[0].bouts.map((bout) => bout.win)).toEqual([true, false])
  })
})
