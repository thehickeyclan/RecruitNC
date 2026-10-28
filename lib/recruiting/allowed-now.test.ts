import { describe, expect, it } from "vitest"

import { allowedNow } from "./allowed-now"

const OCT_2026 = new Date("2026-10-28T12:00:00Z")

describe("allowedNow", () => {
  it("a Class of 2028 boy in October 2026: everyone but Division I may call; Division I from April 1 of junior year", () => {
    const a = allowedNow({ gender: "Male", classYear: 2028, now: OCT_2026 })!
    expect(a.contactOpen).toEqual(["Division II", "Division III", "NAIA"])
    expect(a.contactLater).toEqual([{ level: "Division I", date: "April 1, 2027" }])
    expect(a.line).toBe("D2, D3 and NAIA coaches may call and write now. D1 from April 1, 2027.")
    // Division II official visits open June 15 before junior year; Division I August 15 of senior year.
    expect(a.visitOpen).toContain("Division II")
    expect(a.visitLater.map((o) => o.level)).toEqual(["Division III", "Division I"])
    expect(a.visitLater.find((o) => o.level === "Division I")?.date).toBe("August 15, 2027")
  })

  it("a senior can be called by every level", () => {
    const a = allowedNow({ gender: "Male", classYear: 2027, now: OCT_2026 })!
    expect(a.contactLater).toEqual([])
    expect(a.line).toBe("Coaches at every level may call and write now.")
  })

  it("a girl keeps the June 15 dates", () => {
    const a = allowedNow({ gender: "Female", classYear: 2029, now: OCT_2026 })!
    expect(a.contactLater[0]).toEqual({ level: "Division I", date: "June 15, 2027" })
  })

  it("says nothing without a class year", () => {
    expect(allowedNow({ gender: null, classYear: null })).toBeNull()
  })
})
