import { describe, expect, it } from "vitest"
import { listStatusAfter, summarizeContacts, type CollegeContact } from "./contacts"

const c = (schoolId: string, kind: CollegeContact["kind"], happenedOn: string): CollegeContact => ({ id: `${schoolId}-${kind}-${happenedOn}`, athleteId: "a", schoolId, kind, happenedOn, note: null })

describe("college contacts", () => {
  it("moves a school forward on the list, never back", () => {
    expect(listStatusAfter(null, "call")).toBe("talking")
    expect(listStatusAfter("interested", "text")).toBe("talking")
    expect(listStatusAfter("visited", "call")).toBe("visited")
    expect(listStatusAfter("talking", "visit")).toBe("visited")
    expect(listStatusAfter("visited", "offer")).toBe("offer")
  })

  it("counts each school once, at the furthest step it reached", () => {
    const s = summarizeContacts([c("unc", "call", "2026-09-01"), c("unc", "visit", "2026-10-01"), c("ncsu", "text", "2026-09-10"), c("app", "offer", "2026-10-05")])
    expect(s.reached).toBe(3)
    expect(s.visits).toBe(2)
    expect(s.offers).toBe(1)
    expect(s.bySchool.get("unc")?.latest.kind).toBe("visit")
    expect(s.bySchool.get("unc")?.count).toBe(2)
  })
})
