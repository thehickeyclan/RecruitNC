import { describe, expect, it } from "vitest"
import { boutEventLabel, canonicalEventLabel, isoDay } from "./prospect-last-competed"

describe("isoDay", () => {
  it("reads the season record's US dates and the tables' ISO ones", () => {
    expect(isoDay("2/21/2026")).toBe("2026-02-21")
    expect(isoDay("2026-09-19")).toBe("2026-09-19")
    expect(isoDay("2026-09-19T14:00:00Z")).toBe("2026-09-19")
    expect(isoDay("")).toBeNull()
    expect(isoDay("TBD")).toBeNull()
  })
})

describe("event labels", () => {
  it("names the event, not the bracket", () => {
    expect(boutEventLabel("2026 Tar Heel State Classic - 16U Boys Freestyle")).toBe("Tar Heel State Classic")
    expect(boutEventLabel("2024 USAW Women's Nationals — U17 Women's Freestyle")).toBe("USAW Women's Nationals")
  })

  it("gives one name to an event every table spells differently", () => {
    expect(canonicalEventLabel("NHSCA High School Nationals")).toBe("NHSCA Nationals")
    expect(canonicalEventLabel("2026 NHSCA National Duals")).toBe("NHSCA National Duals")
    expect(canonicalEventLabel("Fargo Junior Women's Freestyle")).toBe("Fargo")
    expect(canonicalEventLabel("Journeymen (OF)")).toBe("Journeymen Fall Classic")
    expect(canonicalEventLabel("2026 Ultimate Club Duals")).toBe("Ultimate Club Duals")
    expect(canonicalEventLabel("Interstate 64 Spring Duals")).toBe("I-64 Duals")
    expect(canonicalEventLabel("NC Super 32 Early Entry")).toBe("Super 32 Early Entry")
  })

  it("keeps an in-season venue as the coach entered it, tidied", () => {
    expect(canonicalEventLabel("NCHSAA Women`s 6A East Regional")).toBe("NCHSAA Women's 6A East Regional")
    expect(canonicalEventLabel("2025 Peak City Girls Championship")).toBe("Peak City Girls Championship")
  })
})
