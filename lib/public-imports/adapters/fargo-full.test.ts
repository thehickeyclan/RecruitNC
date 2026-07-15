import { describe, expect, it } from "vitest"
import { buildFargoLeaderboard } from "@/lib/fargo-leaderboards"
import { normalizeFargoResultType, parseOverSummary } from "@/lib/fargo-result-types"
import {
  expandMatchesToBouts,
  materializeFargoSeasons,
} from "@/lib/public-imports/adapters/fargo-materialize"
import { parseTrackwrestlingExport } from "@/lib/public-imports/adapters/fargo-trackwrestling"
import { parseUsaBracketingExport } from "@/lib/public-imports/adapters/fargo-usa-bracketing"
import {
  buildFargoValidationReport,
  countUniqueDualMatches,
} from "@/lib/public-imports/adapters/fargo-validate"
import { assertOfficialImportHost } from "@/lib/public-imports/fetch-official"
import { diffFargoBoutRows } from "@/lib/public-imports/diff"

describe("fargo result types", () => {
  it("normalizes decision families", () => {
    expect(normalizeFargoResultType("TF 14-4")).toBe("TF")
    expect(normalizeFargoResultType("Fall")).toBe("FALL")
    expect(normalizeFargoResultType("Maj Dec")).toBe("MAJ")
    expect(normalizeFargoResultType("Forfeit")).toBe("FF")
    expect(normalizeFargoResultType("DQ")).toBe("DQ")
  })

  it("parses over summaries", () => {
    const p = parseOverSummary("Liam Hickey (NC) over Seeded Wrestler (IA) (Dec 8-5)")
    expect(p?.winner_name).toBe("Liam Hickey")
    expect(p?.winner_state).toBe("NC")
    expect(p?.loser_state).toBe("IA")
    expect(p?.result_type).toBe("DEC")
    expect(p?.score).toBe("8-5")
  })
})

describe("USA Bracketing adapter", () => {
  it("rejects Flo payloads", () => {
    expect(() =>
      parseUsaBracketingExport({ source: "flo", matches: [], flowrestling_org: true }),
    ).toThrow(/Flo/)
  })

  it("keeps FS and GR independent after materialize", () => {
    const fs = parseUsaBracketingExport({
      year: 2026,
      style: "FS",
      gender: "M",
      age_division: "Junior",
      brackets: [
        {
          weight_class: "150",
          athletes: [{ name: "Liam Hickey", state: "NC", placement: 3 }],
          matches: [
            {
              source_match_id: "m1",
              winner_name: "Liam Hickey",
              winner_state: "NC",
              loser_name: "Opp",
              loser_state: "OH",
              result_type: "TF",
              score: "12-2",
            },
          ],
        },
      ],
    })
    const gr = parseUsaBracketingExport({
      year: 2026,
      style: "GR",
      gender: "M",
      age_division: "Junior",
      brackets: [
        {
          weight_class: "150",
          athletes: [{ name: "Liam Hickey", state: "NC", placement: 5 }],
          matches: [
            {
              source_match_id: "g1",
              winner_name: "Liam Hickey",
              winner_state: "NC",
              loser_name: "GR Opp",
              loser_state: "MN",
              result_type: "DEC",
              score: "4-1",
            },
          ],
        },
      ],
    })

    const seasons = [
      ...materializeFargoSeasons(fs, { stateFilter: "NC" }),
      ...materializeFargoSeasons(gr, { stateFilter: "NC" }),
    ]
    expect(seasons).toHaveLength(2)
    expect(seasons.map((s) => s.style).sort()).toEqual(["FS", "GR"])
    expect(seasons.find((s) => s.style === "FS")?.placement).toBe(3)
    expect(seasons.find((s) => s.style === "GR")?.placement).toBe(5)

    const bouts = [...expandMatchesToBouts(fs), ...expandMatchesToBouts(gr)].filter(
      (b) => b.athlete_state === "NC",
    )
    expect(bouts.every((b) => b.style === "FS" || b.style === "GR")).toBe(true)
    expect(countUniqueDualMatches([...expandMatchesToBouts(fs), ...expandMatchesToBouts(gr)])).toBe(
      2,
    )
  })
})

describe("Trackwrestling adapter", () => {
  it("parses tab Track export for Fargo", () => {
    const text = [
      "Date\tEvent\tWeight\tSummary",
      "07/12/2024\tUSMC Junior Nationals Fargo\t138\tAlex Sample (NC) over Rival One (OH) (TF 10-0)",
      "07/12/2024\tUSMC Junior Nationals Fargo\t138\tRival Two (PA) over Alex Sample (NC) (Dec 7-5)",
    ].join("\n")
    const parsed = parseTrackwrestlingExport(text, {
      year: 2024,
      style: "FS",
      gender: "M",
      age_division: "Junior",
      source_adapter: "trackwrestling",
    })
    expect(parsed.matches).toHaveLength(2)
    const seasons = materializeFargoSeasons(parsed, { stateFilter: "NC" })
    expect(seasons).toHaveLength(1)
    expect(seasons[0].wins).toBe(1)
    expect(seasons[0].losses).toBe(1)
  })
})

describe("validation + bout diff", () => {
  it("reports NC AA / champs and FS vs GR", () => {
    const report = buildFargoValidationReport({
      seasons: [
        {
          year: 2026,
          athlete_name: "A",
          division: "Junior Boys Freestyle",
          style: "FS",
          gender: "M",
          age_division: "Junior",
          weight_class: "150",
          wins: 5,
          losses: 1,
          is_all_american: true,
          placement: 1,
          state: "NC",
        },
        {
          year: 2026,
          athlete_name: "A",
          division: "Junior Boys Greco-Roman",
          style: "GR",
          gender: "M",
          age_division: "Junior",
          weight_class: "150",
          wins: 3,
          losses: 2,
          is_all_american: true,
          placement: 5,
          state: "NC",
        },
      ],
      bouts: [],
      matchCount: 10,
      placerCount: 2,
      diffSummary: { new: 2, match: 0, changed: 0, conflict: 0 },
    })
    expect(report.nc_champions).toBe(1)
    expect(report.nc_all_americans).toBe(2)
    expect(report.by_style.FS.champions).toBe(1)
    expect(report.by_style.GR.all_americans).toBe(1)
  })

  it("diffs bout rows as new when missing", () => {
    const diffs = diffFargoBoutRows(
      [
        {
          year: 2026,
          style: "FS",
          gender: "M",
          age_division: "Junior",
          weight_class: "150",
          athlete_name: "Liam Hickey",
          opponent_name: "Opp",
          win: true,
          result_type: "TF",
          source_match_id: "m1",
          match_order: 1,
        },
      ],
      [],
    )
    expect(diffs[0]?.diff_status).toBe("new")
  })
})

describe("official fetch allowlist", () => {
  it("allows USAB / Track hosts and blocks Flo", () => {
    expect(() => assertOfficialImportHost("https://usawrestlingevents.com/event/1")).not.toThrow()
    expect(() => assertOfficialImportHost("https://www.trackwrestling.com/x")).not.toThrow()
    expect(() => assertOfficialImportHost("https://www.flowrestling.org/x")).toThrow(/Flo/)
  })
})

describe("bundled Fargo fixtures", () => {
  it("ships Junior Boys FS + GR 2026 JSON for serverless runtime", async () => {
    const { getBundledFargoExport } = await import("@/lib/public-imports/fixtures/fargo")
    const fs = getBundledFargoExport("scripts/data/fargo/exports/2026-junior-boys-fs.json")
    const gr = getBundledFargoExport("scripts/data/fargo/exports/2026-junior-boys-gr.json")
    expect(fs).toContain("Junior")
    expect(fs).toContain("Liam Hickey")
    expect(gr).toContain('"style":"GR"')
    expect(getBundledFargoExport("scripts/data/fargo/exports/missing.json")).toBeNull()
  })
})

describe("leaderboards style split", () => {
  it("ranks Greco separately from combined", () => {
    const rows = [
      {
        athlete_name: "Grepco Ace",
        state: "NC",
        style: "GR",
        placement: 1,
        is_all_american: true,
        wins: 6,
        losses: 0,
      },
      {
        athlete_name: "FS Ace",
        state: "NC",
        style: "FS",
        placement: 1,
        is_all_american: true,
        wins: 6,
        losses: 0,
      },
      {
        athlete_name: "Both",
        state: "NC",
        style: "FS",
        placement: 3,
        is_all_american: true,
        wins: 4,
        losses: 1,
      },
      {
        athlete_name: "Both",
        state: "NC",
        style: "GR",
        placement: 3,
        is_all_american: true,
        wins: 4,
        losses: 1,
      },
    ]
    const greco = buildFargoLeaderboard(rows, { style: "GR", state: "NC", metric: "titles" })
    expect(greco[0]?.athlete_name).toBe("Grepco Ace")
    const combined = buildFargoLeaderboard(rows, {
      style: "combined",
      state: "NC",
      metric: "allAmericans",
    })
    expect(combined.find((r) => r.athlete_name === "Both")?.allAmericans).toBe(2)
  })
})
