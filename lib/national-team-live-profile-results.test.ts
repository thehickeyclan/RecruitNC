import { describe, expect, it } from "vitest"
import {
  buildNhscaDuals2026LiveProfileResults,
  matchWrestlerRecordForProfile,
  mergeNationalTeamResultsForProfile,
  NHSCA_DUALS_NATIONAL_EVENT_LABEL,
  NHSCA_DUALS_SELECT_EVENT_LABEL,
} from "@/lib/national-team-live-profile-results"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

const emptySummaries = (): NhscaDualsResultsSnapshot["summaries"] => ({
  national: {
    dualWins: 0,
    dualLosses: 0,
    matchWins: 0,
    matchLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    undefeated: [],
    topScorers: [],
  },
  select: {
    dualWins: 0,
    dualLosses: 0,
    matchWins: 0,
    matchLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    undefeated: [],
    topScorers: [],
  },
})

describe("matchWrestlerRecordForProfile", () => {
  it("matches abbreviated card names to roster names", () => {
    const records = [
      {
        wrestlerId: "w1",
        name: "Dominic Blue",
        displayWeight: "170",
        wins: 3,
        losses: 1,
        pointsFor: 9,
        pointsAgainst: 3,
      },
    ]
    expect(matchWrestlerRecordForProfile(["Dom Blue"], records)?.wrestlerId).toBe("w1")
  })
})

describe("buildNhscaDuals2026LiveProfileResults", () => {
  const nationalTeamId = "team-national"
  const selectTeamId = "team-select"
  const wrestlerId = "w-dom"

  const snapshot: NhscaDualsResultsSnapshot = {
    teams: [
      { id: nationalTeamId, name: "National", team_type: "national" },
      { id: selectTeamId, name: "Select", team_type: "select" },
    ],
    wrestlers: [
      {
        id: wrestlerId,
        team_id: nationalTeamId,
        name: "Dominic Blue",
        weight_class: "170",
        display_weight: "170",
        active: true,
      },
    ],
    days: [{ id: "day-1", name: "Day 1", event_date: null, sort_order: 1 }],
    pools: [],
    duals: [
      {
        id: "dual-1",
        team_id: nationalTeamId,
        day_id: "day-1",
        pool_id: "pool-1",
        round_name: "Round 1",
        opponent_team_name: "Opponent",
        status: "final",
        nc_score: 42,
        opponent_score: 30,
        sort_order: 1,
        published: true,
      },
    ],
    matches: [
      {
        id: "m1",
        dual_id: "dual-1",
        weight: "170",
        nc_wrestler_id: wrestlerId,
        opponent_wrestler_name: "Opp",
        winner: "nc",
        result_type: "decision",
        nc_points: 3,
        opponent_points: 0,
        notes: null,
      },
      {
        id: "m2",
        dual_id: "dual-1",
        weight: "170",
        nc_wrestler_id: wrestlerId,
        opponent_wrestler_name: "Opp 2",
        winner: "opponent",
        result_type: "major_decision",
        nc_points: 0,
        opponent_points: 4,
        notes: null,
      },
    ],
    summaries: emptySummaries(),
  }

  it("returns live W-L for national roster match", () => {
    const rows = buildNhscaDuals2026LiveProfileResults(snapshot, ["Dominic Blue"])
    expect(rows).toEqual([
      {
        event: NHSCA_DUALS_NATIONAL_EVENT_LABEL,
        year: 2026,
        record: "1-1",
        isPlaceholder: false,
      },
    ])
  })
})

describe("mergeNationalTeamResultsForProfile", () => {
  it("prefers live scored record over registration placeholder", () => {
    const merged = mergeNationalTeamResultsForProfile({
      fromTable: [],
      fromAthleteRow: [],
      fromLive: [{ event: NHSCA_DUALS_NATIONAL_EVENT_LABEL, year: 2026, record: "4-2", isPlaceholder: false }],
      fromRegistration: [
        { event: NHSCA_DUALS_NATIONAL_EVENT_LABEL, year: 2026, record: "0-0", isPlaceholder: true },
      ],
    })
    expect(merged).toEqual([{ event: NHSCA_DUALS_NATIONAL_EVENT_LABEL, year: 2026, record: "4-2", isPlaceholder: false }])
  })

  it("keeps manual table record when live has not scored bouts yet", () => {
    const merged = mergeNationalTeamResultsForProfile({
      fromTable: [{ event: NHSCA_DUALS_NATIONAL_EVENT_LABEL, year: 2026, record: "3-1" }],
      fromAthleteRow: [],
      fromLive: [{ event: NHSCA_DUALS_NATIONAL_EVENT_LABEL, year: 2026, record: "0-0", isPlaceholder: true }],
      fromRegistration: [],
    })
    expect(merged[0]?.record).toBe("3-1")
  })

  it("includes national and select rows independently", () => {
    const merged = mergeNationalTeamResultsForProfile({
      fromTable: [],
      fromAthleteRow: [],
      fromLive: [
        { event: NHSCA_DUALS_SELECT_EVENT_LABEL, year: 2026, record: "2-0", isPlaceholder: false },
      ],
      fromRegistration: [
        { event: NHSCA_DUALS_NATIONAL_EVENT_LABEL, year: 2026, record: "0-0", isPlaceholder: true },
      ],
    })
    expect(merged).toHaveLength(2)
    expect(merged.map((r) => r.event)).toContain(NHSCA_DUALS_SELECT_EVENT_LABEL)
    expect(merged.map((r) => r.event)).toContain(NHSCA_DUALS_NATIONAL_EVENT_LABEL)
  })
})
