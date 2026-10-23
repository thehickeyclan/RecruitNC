import { describe, expect, it } from "vitest"

import { deadlineLine, nextDeadline, planOptionLabel, type AdmissionsSummary } from "./admissions-format"

const cornell: AdmissionsSummary = {
  deadlines: [
    { plan: "ed1", date: "2026-11-01", label: null, raw: null },
    { plan: "rd", date: "2027-01-02", label: null, raw: null },
  ],
  notOffered: ["ed2", "ea", "rea"],
  rolling: false,
  applyUrl: "https://apply.commonapp.org",
  testPolicy: "Required",
  fee: 80,
  feeWaiver: true,
  aidForm: "FAFSA + CSS Profile",
}

describe("nextDeadline", () => {
  it("picks the earliest one ahead", () => {
    const d = nextDeadline(cornell, null, "2026-10-22")!
    expect(d.plan).toBe("ed1")
    expect(deadlineLine(d)).toBe("Early Decision closes Nov 1 · 10 days")
  })
  it("follows the family's chosen plan", () => {
    expect(nextDeadline(cornell, "rd", "2026-10-22")?.date).toBe("2027-01-02")
  })
  it("skips a passed deadline", () => {
    expect(nextDeadline(cornell, null, "2026-11-02")?.plan).toBe("rd")
  })
  it("says today and tomorrow", () => {
    expect(deadlineLine(nextDeadline(cornell, null, "2026-11-01")!)).toMatch(/· today$/)
    expect(deadlineLine(nextDeadline(cornell, null, "2026-10-31")!)).toMatch(/· tomorrow$/)
  })
  it("never counts down a date given without a year", () => {
    const s = { ...cornell, deadlines: [{ plan: "rd" as const, date: null, label: null, raw: "March 1" }] }
    expect(nextDeadline(s, null, "2026-10-22")).toBeNull()
    expect(planOptionLabel(s, "rd")).toBe("Regular Decision · March 1")
  })
})

describe("planOptionLabel", () => {
  it("names the date or says not offered", () => {
    expect(planOptionLabel(cornell, "ed1")).toBe("Early Decision · Nov 1")
    expect(planOptionLabel(cornell, "ea")).toBe("Early Action · not offered")
  })
})
