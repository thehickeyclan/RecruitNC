import { describe, expect, it } from "vitest"
import { buildPublicRankingRows } from "./publish-public-rankings"

const scored = {
  name: "Carson Worrick",
  highschool: "Davie",
  weightclass: 165,
  state_placements: ["2026 7A champion", "2025 7A 3rd"],
  nhsca_record: "2026 7-2",
  super32_record: null,
  significant_wins: [{ opponent: "Somebody" }],
}

function rowsFor(overrides: { board?: unknown; athlete?: Record<string, unknown> } = {}) {
  return buildPublicRankingRows({
    publicRows: [{ athlete_id: "a1", rank: 1 }],
    boardById: new Map(overrides.board === null ? [] : [["a1", (overrides.board ?? scored) as never]]),
    athleteById: new Map([["a1", overrides.athlete ?? { name: "Fallback", highschool: "Other", weightclass: "120", academic_gpa: 3.8 }]]),
    year: 2027,
    gender: "Male",
    publishedAt: "2026-09-08T18:00:00.000Z",
  })
}

describe("buildPublicRankingRows", () => {
  it("writes gender lowercase, the way the table already stores it", () => {
    // A capitalised value would split one class into two the app cannot reconcile.
    expect(rowsFor()[0].gender).toBe("male")
  })

  it("takes the newest state placement as the headline result", () => {
    expect(rowsFor()[0].state_result).toBe("2026 7A champion")
  })

  it("renders ranked_win as the string the app prints, not a boolean", () => {
    expect(rowsFor()[0].ranked_win).toBe("Yes")
    expect(rowsFor({ board: { ...scored, significant_wins: [] } })[0].ranked_win).toBe("No")
  })

  it("falls back to the athlete row when the board has no entry", () => {
    const row = rowsFor({ board: null })[0]
    expect(row.name).toBe("Fallback")
    expect(row.high_school).toBe("Other")
    expect(row.weight_class).toBe("120")
  })

  it("carries the GPA only when it is really a number", () => {
    expect(rowsFor()[0].academic_gpa).toBe(3.8)
    expect(rowsFor({ athlete: { academic_gpa: "3.8" } })[0].academic_gpa).toBeNull()
  })

  it("marks every row published, with the rank and timestamp it was given", () => {
    const row = rowsFor()[0]
    expect(row.is_published).toBe(true)
    expect(row.prospect_ranking).toBe(1)
    expect(row.published_at).toBe("2026-09-08T18:00:00.000Z")
    expect(row.graduation_year).toBe(2027)
    expect(row.prospect_id).toBe("a1")
  })

  it("keeps the published order", () => {
    const rows = buildPublicRankingRows({
      publicRows: [
        { athlete_id: "a1", rank: 1 },
        { athlete_id: "a2", rank: 2 },
      ],
      boardById: new Map([["a1", scored as never]]),
      athleteById: new Map([["a2", { name: "Second" }]]),
      year: 2027,
      gender: "Male",
      publishedAt: "2026-09-08T18:00:00.000Z",
    })
    expect(rows.map((r) => `${r.prospect_ranking} ${r.name}`)).toEqual(["1 Carson Worrick", "2 Second"])
  })
})
