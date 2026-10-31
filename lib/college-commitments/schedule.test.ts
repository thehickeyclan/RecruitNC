import { describe, expect, it } from "vitest"
import { commitmentRunDecision } from "@/lib/college-commitments/schedule"

describe("how often the lists are read", () => {
  it("reads daily through the November signing period", () => {
    expect(commitmentRunDecision(new Date("2026-11-12T13:00:00Z"))).toMatchObject({ run: true, cadence: "daily" })
  })

  it("reads daily in the week after Super 32, when the commitments follow the results", () => {
    expect(commitmentRunDecision(new Date("2026-10-28T13:00:00Z"))).toMatchObject({ run: true, cadence: "daily" })
  })

  it("reads once a week the rest of the year", () => {
    /* 2027-02-01 is a Monday; the Wednesday after it is quiet. */
    expect(commitmentRunDecision(new Date("2027-02-01T13:00:00"))).toMatchObject({ run: true, cadence: "weekly" })
    expect(commitmentRunDecision(new Date("2027-02-03T13:00:00")).run).toBe(false)
  })
})
