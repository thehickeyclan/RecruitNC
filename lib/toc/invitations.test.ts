import { describe, expect, it } from "vitest"
import {
  defaultTocWeightForAthlete,
  isTocAthleteId,
  parseAthleteWeightClass,
  tocAthleteConfirmSchema,
} from "@/lib/toc/invitations"

describe("isTocAthleteId", () => {
  it("accepts real UUIDs and rejects doc placeholders", () => {
    expect(isTocAthleteId("550e8400-e29b-41d4-a716-446655440000")).toBe(true)
    expect(isTocAthleteId("{athlete-uuid}")).toBe(false)
    expect(isTocAthleteId("")).toBe(false)
  })
})

describe("parseAthleteWeightClass", () => {
  it("parses numeric and string weight classes in TOC list", () => {
    expect(parseAthleteWeightClass(157)).toBe(157)
    expect(parseAthleteWeightClass("157")).toBe(157)
    expect(parseAthleteWeightClass("157 lbs")).toBe(157)
  })

  it("returns null for out-of-list weights", () => {
    expect(parseAthleteWeightClass(160)).toBeNull()
    expect(parseAthleteWeightClass("")).toBeNull()
  })
})

describe("defaultTocWeightForAthlete", () => {
  it("falls back to 149 when profile weight is not a TOC class", () => {
    expect(defaultTocWeightForAthlete("160")).toBe(149)
  })
})

describe("tocAthleteConfirmSchema", () => {
  it("requires all acknowledgments and jacket size", () => {
    const ok = tocAthleteConfirmSchema.safeParse({
      athleteId: "550e8400-e29b-41d4-a716-446655440000",
      weightClass: 157,
      jacketSize: "AL",
      attendanceAcknowledgment: true,
      weightAcknowledgment: true,
      usawAcknowledgment: true,
      photoReleaseAccepted: true,
    })
    expect(ok.success).toBe(true)

    const bad = tocAthleteConfirmSchema.safeParse({
      athleteId: "550e8400-e29b-41d4-a716-446655440000",
      weightClass: 157,
      jacketSize: "AL",
      attendanceAcknowledgment: false,
      weightAcknowledgment: true,
      usawAcknowledgment: true,
      photoReleaseAccepted: true,
    })
    expect(bad.success).toBe(false)
  })
})
