import { describe, expect, it } from "vitest"
import { buildDualFeed, getWrestlerRecords } from "@/lib/nhsca-duals-command-center"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

describe("buildDualFeed archive visibility", () => {
  const snapshot: NhscaDualsResultsSnapshot = {
    teams: [{ id: "nat", name: "National", team_type: "national" }],
    wrestlers: [],
    days: [],
    pools: [],
    duals: [
      {
        id: "dual-unpub",
        team_id: "nat",
        day_id: "d1",
        pool_id: "p1",
        round_name: "Round 1",
        opponent_team_name: "Test Opponent",
        status: "final",
        nc_score: 42,
        opponent_score: 30,
        sort_order: 1,
        published: false,
      },
    ],
    matches: [],
    summaries: {
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
    },
  }

  it("hides unpublished finals from hub feed by default", () => {
    expect(buildDualFeed(snapshot, "national")).toHaveLength(0)
  })

  it("shows unpublished finals on public archive feed", () => {
    expect(buildDualFeed(snapshot, "national", "all", { includeUnpublishedFinals: true })).toHaveLength(1)
  })
})
import { buildTeamSummary } from "@/lib/nhsca-duals-live-results/summaries"
import { matchCountsTowardWrestlerRecord } from "@/lib/nhsca-duals-live-results/scoring"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"

describe("matchCountsTowardWrestlerRecord", () => {
  it("excludes forfeits and injury defaults", () => {
    expect(matchCountsTowardWrestlerRecord("forfeit")).toBe(false)
    expect(matchCountsTowardWrestlerRecord("injury_default")).toBe(false)
  })

  it("includes on-the-mat results", () => {
    expect(matchCountsTowardWrestlerRecord("decision")).toBe(true)
    expect(matchCountsTowardWrestlerRecord("fall")).toBe(true)
  })
})

describe("NHSCA duals wrestler records", () => {
  const teamId = "team-national"
  const wrestlerId = "w-106"

  const snapshot: NhscaDualsResultsSnapshot = {
    teams: [{ id: teamId, name: "National", team_type: "national" }],
    wrestlers: [
      {
        id: wrestlerId,
        team_id: teamId,
        name: "Test Wrestler",
        weight_class: "106",
        display_weight: "106",
        active: true,
      },
    ],
    days: [],
    pools: [],
    duals: [
      {
        id: "dual-1",
        team_id: teamId,
        day_id: "day-1",
        pool_id: "pool-1",
        round_name: "Round 1",
        opponent_team_name: "Opponent",
        status: "final",
        nc_score: 12,
        opponent_score: 6,
        sort_order: 1,
        published: true,
      },
    ],
    matches: [
      {
        id: "m-dec",
        dual_id: "dual-1",
        weight: "106",
        nc_wrestler_id: wrestlerId,
        opponent_wrestler_name: "Opp A",
        winner: "nc",
        result_type: "decision",
        nc_points: 3,
        opponent_points: 0,
        notes: null,
      },
      {
        id: "m-ff",
        dual_id: "dual-1",
        weight: "113",
        nc_wrestler_id: null,
        opponent_wrestler_name: "",
        winner: "nc",
        result_type: "forfeit",
        nc_points: 6,
        opponent_points: 0,
        notes: null,
      },
    ],
    summaries: {
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
    },
  }

  it("counts only on-the-mat bouts in athlete W-L", () => {
    const records = getWrestlerRecords(snapshot, "national")
    const rec = records.find((r) => r.wrestlerId === wrestlerId)
    expect(rec?.wins).toBe(1)
    expect(rec?.losses).toBe(0)
    expect(rec?.pointsFor).toBe(3)
  })

  it("excludes forfeits from team individual bout totals but keeps team points", () => {
    const summary = buildTeamSummary(teamId, snapshot.duals, snapshot.matches, snapshot.wrestlers)
    expect(summary.matchWins).toBe(1)
    expect(summary.matchLosses).toBe(0)
    expect(summary.pointsFor).toBe(9)
  })
})
