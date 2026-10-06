import { describe, expect, it } from "vitest"
import { checkReportedWin, reviewNote } from "./reported-win-check"

function fakeAdmin(rows: Array<{ win: boolean | null; opponent_name: string }>) {
  const q: any = { select: () => q, eq: () => q, ilike: () => q, limit: async () => ({ data: rows }) }
  return { from: () => q } as never
}

describe("checkReportedWin", () => {
  it("confirms a win we hold", async () => {
    expect(await checkReportedWin(fakeAdmin([{ win: true, opponent_name: "Lincoln Snell" }]), "a", "Lincoln Snell")).toBe("confirmed")
  })
  it("flags a reported win our brackets show as a loss", async () => {
    expect(await checkReportedWin(fakeAdmin([{ win: false, opponent_name: "Lincoln Snell" }]), "a", "Lincoln Snell")).toBe("contradicted")
  })
  it("treats an event we do not hold as unverified, not as a problem", async () => {
    expect(await checkReportedWin(fakeAdmin([]), "a", "Kaden Matineau")).toBe("unverified")
  })
  it("ignores a different wrestler whose surname merely contains the name", async () => {
    expect(await checkReportedWin(fakeAdmin([{ win: false, opponent_name: "Ann Snellgrove" }]), "a", "Lincoln Snell")).toBe("unverified")
  })
})

describe("reviewNote", () => {
  it("closes confirmed and unverified wins, and escalates only contradictions", () => {
    expect(reviewNote("confirmed").status).toBe("approved")
    expect(reviewNote("unverified").status).toBe("approved")
    expect(reviewNote("contradicted").status).toBe("pending")
  })
})
