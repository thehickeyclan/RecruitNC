import { describe, expect, it } from "vitest"
import {
  buildTournamentResultRow,
  FAMILY_SUBMITTED,
  parseSubmittedPlacement,
  parseSubmittedRecord,
  submittedEventKey,
} from "./tournament-result-submission"

describe("parseSubmittedPlacement", () => {
  it("reads the ways a parent writes a placement", () => {
    expect(parseSubmittedPlacement("3rd")).toBe(3)
    expect(parseSubmittedPlacement("3")).toBe(3)
    expect(parseSubmittedPlacement("Champion")).toBe(1)
    expect(parseSubmittedPlacement("runner-up")).toBe(2)
  })

  it("treats blank as did not place, never as a placing", () => {
    // The form says "leave blank if you did not place". Inventing a placement from an empty
    // box is the Zaggout bug with a different author.
    expect(parseSubmittedPlacement("")).toBeNull()
    expect(parseSubmittedPlacement(null)).toBeNull()
    expect(parseSubmittedPlacement("did not place")).toBeNull()
  })
})

describe("parseSubmittedRecord", () => {
  it("reads a record", () => {
    expect(parseSubmittedRecord("4-2")).toEqual({ wins: 4, losses: 2 })
    expect(parseSubmittedRecord(" 10 – 1 ")).toEqual({ wins: 10, losses: 1 })
  })

  it("refuses to guess at anything else", () => {
    expect(parseSubmittedRecord("went 4 and 2")).toEqual({ wins: 0, losses: 0 })
    expect(parseSubmittedRecord("")).toEqual({ wins: 0, losses: 0 })
  })
})

describe("submittedEventKey", () => {
  it("is stable, so two submissions for one event group", () => {
    expect(submittedEventKey("Walsh Ironman", 2026)).toBe("submitted-walsh-ironman-2026")
    expect(submittedEventKey("  Walsh   Ironman  ", 2026)).toBe("submitted-walsh-ironman-2026")
  })
})

describe("buildTournamentResultRow", () => {
  const base = {
    athleteId: "abc",
    athleteName: "Adam Walker",
    highSchool: "Holly Springs",
    club: "Triangle Wrestling Academy",
    requestId: "req-1",
  }

  it("marks the row family-submitted, never verified", () => {
    // Every one of the 604 imported rows is "verified", off a bracket. A parent's recollection
    // is useful and is not the same thing, and a college coach is owed the difference.
    const built = buildTournamentResultRow({
      ...base,
      form: { event: "Walsh Ironman", date: "2025-12-20", weight: "126", placement: "5th", record: "6-2" },
    })
    expect(built.ok && built.row.verification_status).toBe(FAMILY_SUBMITTED)
    expect(built.ok && built.row.placement).toBe(5)
    expect(built.ok && built.row.record).toBe("6-2")
    expect(built.ok && built.row.year).toBe(2025)
  })

  it("never grants Super 32 qualification off a submission", () => {
    const built = buildTournamentResultRow({
      ...base,
      form: { event: "Some Open", date: "2026-01-10", placement: "1st", record: "5-0" },
    })
    expect(built.ok && built.row.qualified).toBe(false)
  })

  it("keeps the team they named, for the duals case", () => {
    const built = buildTournamentResultRow({
      ...base,
      form: { event: "NHSCA Duals", date: "2026-03-28", team: "Pennsylvania Elite", record: "3-2" },
    })
    expect(built.ok && built.row.club).toBe("Pennsylvania Elite")
  })

  it("refuses a submission with nothing to anchor it", () => {
    expect(buildTournamentResultRow({ ...base, form: { date: "2026-01-01" } })).toMatchObject({ ok: false })
    expect(buildTournamentResultRow({ ...base, form: { event: "Some Open" } })).toMatchObject({ ok: false })
  })

  it("traces the row back to the request that produced it", () => {
    const built = buildTournamentResultRow({
      ...base,
      form: { event: "Powerade", date: "2025-12-29", record: "4-2" },
    })
    expect(built.ok && built.row.source_file).toBe("edit_request:req-1")
  })
})
