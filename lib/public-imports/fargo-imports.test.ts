import { describe, expect, it } from "vitest"
import { summarizeFargoCareer } from "@/lib/fargo-career"
import { parseFargoDivisionString } from "@/lib/fargo-division"
import { diffFargoRows, summarizeDiffs } from "@/lib/public-imports/diff"
import { fargoNaturalKey } from "@/lib/public-imports/normalize"
import { parseFargoCsv, parseFargoPayload } from "@/lib/public-imports/parse-fargo"
import type { FargoProposed } from "@/lib/public-imports/types"

describe("fargo division parsing", () => {
  it("parses Junior Boys Freestyle", () => {
    expect(parseFargoDivisionString("Junior Boys Freestyle")).toEqual({
      style: "FS",
      gender: "M",
      age_division: "Junior",
      division: "Junior Boys Freestyle",
    })
  })

  it("parses 16U Girls Greco-Roman as independent style", () => {
    expect(parseFargoDivisionString("16U Girls Greco-Roman")).toEqual({
      style: "GR",
      gender: "F",
      age_division: "16U",
      division: "16U Girls Greco-Roman",
    })
  })
})

describe("fargo natural key — FS vs GR independent", () => {
  it("does not collide when same athlete/year/weight wrestles both styles", () => {
    const fs = fargoNaturalKey(2026, "FS", "Junior", "M", "150", "Liam Hickey")
    const gr = fargoNaturalKey(2026, "GR", "Junior", "M", "150", "Liam Hickey")
    expect(fs).not.toBe(gr)
  })
})

describe("parse Fargo CSV / JSON", () => {
  it("parses seed CSV with style from division", () => {
    const csv = `first_name,last_name,event_year,division,weight,wins,losses,placement,is_all_american,notes
Liam,Hickey,2026,Junior Boys Freestyle,150,5,1,3,true,AA
Liam,Hickey,2026,Junior Boys Greco-Roman,150,4,2,5,true,AA Greco
`
    const rows = parseFargoCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.style).sort()).toEqual(["FS", "GR"])
    expect(rows.every((r) => r.age_division === "Junior")).toBe(true)
  })

  it("keeps FS and GR as separate proposed rows in JSON", () => {
    const rows = parseFargoPayload({
      records: [
        {
          year: 2026,
          athlete_name: "Liam Hickey",
          division: "Junior Boys Freestyle",
          weight_class: "150",
          wins: 5,
          losses: 1,
          placement: 3,
          is_all_american: true,
        },
        {
          year: 2026,
          athlete_name: "Liam Hickey",
          style: "GR",
          age_division: "Junior",
          gender: "M",
          weight_class: "150",
          wins: 4,
          losses: 2,
          placement: 5,
          is_all_american: true,
        },
      ],
    })
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((r) => r.style))).toEqual(new Set(["FS", "GR"]))
  })
})

describe("diff Fargo rows", () => {
  const base: FargoProposed = {
    year: 2026,
    athlete_name: "Liam Hickey",
    division: "Junior Boys Freestyle",
    style: "FS",
    gender: "M",
    age_division: "Junior",
    weight_class: "150",
    wins: 5,
    losses: 1,
    record: "5-1",
    placement: 3,
    is_all_american: true,
  }

  it("marks new vs match independently for FS and GR", () => {
    const existing = [
      {
        year: 2026,
        athlete_name: "Liam Hickey",
        style: "FS",
        gender: "M",
        age_division: "Junior",
        weight_class: "150",
        wins: 5,
        losses: 1,
        placement: 3,
        is_all_american: true,
        high_school: null,
        verification_status: "staged",
      },
    ]
    const proposed: FargoProposed[] = [
      base,
      {
        ...base,
        style: "GR",
        division: "Junior Boys Greco-Roman",
        wins: 4,
        losses: 2,
        record: "4-2",
        placement: 5,
      },
    ]
    const diffs = diffFargoRows(proposed, existing)
    const summary = summarizeDiffs(diffs)
    expect(summary.match).toBe(1)
    expect(summary.new).toBe(1)
  })

  it("conflicts when changing a verified row", () => {
    const existing = [
      {
        year: 2026,
        athlete_name: "Liam Hickey",
        style: "FS",
        gender: "M",
        age_division: "Junior",
        weight_class: "150",
        wins: 5,
        losses: 1,
        placement: 3,
        is_all_american: true,
        high_school: null,
        verification_status: "verified",
      },
    ]
    const diffs = diffFargoRows([{ ...base, wins: 6, losses: 0, record: "6-0" }], existing)
    expect(diffs[0]?.diff_status).toBe("conflict")
  })
})

describe("Fargo career FS / GR / combined", () => {
  it("counts All-Americans per style and combined", () => {
    const career = summarizeFargoCareer([
      {
        year: 2025,
        style: "FS",
        is_all_american: true,
        placement: 3,
        wins: 5,
        losses: 1,
      },
      {
        year: 2025,
        style: "GR",
        is_all_american: true,
        placement: 5,
        wins: 4,
        losses: 2,
      },
      {
        year: 2026,
        division: "Junior Boys Freestyle",
        is_all_american: false,
        placement: null,
        wins: 2,
        losses: 2,
      },
    ])
    expect(career.freestyle.allAmericans).toBe(1)
    expect(career.greco.allAmericans).toBe(1)
    expect(career.combined.allAmericans).toBe(2)
    expect(career.combined.record).toBe("11-5")
    expect(career.freestyle.record).toBe("7-3")
    expect(career.greco.record).toBe("4-2")
  })
})
